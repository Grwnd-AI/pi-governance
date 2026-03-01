import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { minimatch } from 'minimatch';
import type {
  PolicyEngine,
  PolicyDecision,
  PathOperation,
  ExecutionMode,
  BashOverrides,
} from './engine.js';

export interface YamlRole {
  allowed_tools: string[];
  blocked_tools: string[];
  prompt_template: string;
  execution_mode: ExecutionMode;
  human_approval: {
    required_for: string[];
    auto_approve?: string[];
  };
  token_budget_daily: number;
  allowed_paths: string[];
  blocked_paths: string[];
  bash_overrides?: {
    additional_blocked?: string[];
    additional_allowed?: string[];
  };
}

export interface YamlRules {
  roles: Record<string, YamlRole>;
}

export class YamlPolicyEngine implements PolicyEngine {
  private rules: YamlRules;

  constructor(rulesFilePathOrRules: string | YamlRules) {
    if (typeof rulesFilePathOrRules === 'string') {
      const raw = readFileSync(rulesFilePathOrRules, 'utf-8');
      this.rules = parseYaml(raw) as YamlRules;
    } else {
      this.rules = rulesFilePathOrRules;
    }
  }

  private getRole(role: string): YamlRole {
    const r = this.rules.roles[role];
    if (!r) {
      throw new Error(
        `Unknown role: ${role}. Available roles: ${Object.keys(this.rules.roles).join(', ')}`,
      );
    }
    return r;
  }

  evaluateTool(role: string, tool: string): PolicyDecision {
    const r = this.getRole(role);

    // Check blocked list first
    if (r.blocked_tools.includes(tool)) return 'deny';

    // Check allowed list
    if (r.allowed_tools.includes('all') || r.allowed_tools.includes(tool)) {
      return 'allow';
    }

    // Not in either list — deny by default
    return 'deny';
  }

  evaluatePath(
    role: string,
    _orgUnit: string,
    _operation: PathOperation,
    path: string,
  ): PolicyDecision {
    const r = this.getRole(role);

    // Check blocked paths first (takes precedence)
    for (const pattern of r.blocked_paths) {
      if (minimatch(path, pattern, { dot: true })) {
        return 'deny';
      }
    }

    // Check allowed paths
    for (const pattern of r.allowed_paths) {
      const resolved = pattern.replace('{{project_path}}', process.cwd());
      if (minimatch(path, resolved, { dot: true })) {
        return 'allow';
      }
    }

    // Not in allowed paths — deny
    return 'deny';
  }

  requiresApproval(role: string, tool: string): boolean {
    const r = this.getRole(role);

    // Auto-approve takes precedence
    if (r.human_approval.auto_approve?.includes(tool)) return false;

    // Check required list
    if (r.human_approval.required_for.includes('all')) return true;
    return r.human_approval.required_for.includes(tool);
  }

  getExecutionMode(role: string): ExecutionMode {
    return this.getRole(role).execution_mode;
  }

  getTemplateName(role: string): string {
    return this.getRole(role).prompt_template;
  }

  getBashOverrides(role: string): BashOverrides {
    const r = this.getRole(role);
    const overrides = r.bash_overrides;
    if (!overrides) return {};

    return {
      additionalBlocked: overrides.additional_blocked?.map((p) => new RegExp(p)),
      additionalAllowed: overrides.additional_allowed?.map((p) => new RegExp(p)),
    };
  }

  getTokenBudget(role: string): number {
    return this.getRole(role).token_budget_daily;
  }
}
