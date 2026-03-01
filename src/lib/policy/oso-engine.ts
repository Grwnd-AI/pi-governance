import type {
  PolicyEngine,
  PolicyDecision,
  PathOperation,
  ExecutionMode,
  BashOverrides,
} from './engine.js';
import type { FactStore } from '../facts/store.js';

// Resource classes for Oso registration
class User {
  constructor(
    public role: string,
    public orgUnit?: string,
  ) {}
}

class Tool {
  constructor(public name: string) {}
}

class FilePath {
  constructor(
    public path: string,
    public orgUnit: string,
  ) {}
}

class AgentSession {}

export class OsoPolicyEngine implements PolicyEngine {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private oso: any;
  private roleConfigs: Map<string, Record<string, unknown>> = new Map();

  private constructor() {}

  static async create(polarFiles: string[], factStore: FactStore): Promise<OsoPolicyEngine> {
    let OsoClass;
    try {
      const osoModule = await import('oso');
      OsoClass = osoModule.Oso;
    } catch {
      throw new Error(
        'oso package is not installed. Install it with: npm install oso\n' +
          'Or switch to the YAML policy engine: policy.engine: yaml',
      );
    }

    const engine = new OsoPolicyEngine();
    engine.oso = new OsoClass();

    engine.oso.registerClass(User);
    engine.oso.registerClass(Tool);
    engine.oso.registerClass(FilePath);
    engine.oso.registerClass(AgentSession);

    for (const file of polarFiles) {
      await engine.oso.loadFiles([file]);
    }

    const bindings = await factStore.getAllRoleBindings();
    for (const binding of bindings) {
      if (binding.config) {
        engine.roleConfigs.set(binding.role, binding.config);
      }
    }

    return engine;
  }

  evaluateTool(role: string, tool: string): PolicyDecision {
    const user = new User(role);
    const toolResource = new Tool(tool);

    // isAllowed is async in oso, but we need sync for the interface.
    // Use a synchronous check via queryRuleOnce if available,
    // otherwise we cache results. For now, use a sync wrapper.
    // NOTE: In practice, the Pi extension calls this in an async context,
    // so we provide an async-compatible path.
    try {
      // oso's isAllowed returns a Promise<boolean> — but we need sync.
      // This will be called from an async context in practice.
      // For the sync interface, we do a best-effort check using queryRule.
      const result = this.oso.isAllowedSync?.(user, 'invoke', toolResource);
      if (result !== undefined) {
        return result ? 'allow' : 'deny';
      }
    } catch {
      // isAllowedSync not available
    }

    // Fallback: deny if we can't check synchronously
    return 'deny';
  }

  async evaluateToolAsync(role: string, tool: string): Promise<PolicyDecision> {
    const user = new User(role);
    const toolResource = new Tool(tool);
    const allowed = await this.oso.isAllowed(user, 'invoke', toolResource);
    return allowed ? 'allow' : 'deny';
  }

  evaluatePath(
    role: string,
    orgUnit: string,
    operation: PathOperation,
    _path: string,
  ): PolicyDecision {
    const user = new User(role, orgUnit);
    const filePath = new FilePath(_path, orgUnit);

    try {
      const result = this.oso.isAllowedSync?.(user, operation, filePath);
      if (result !== undefined) {
        return result ? 'allow' : 'deny';
      }
    } catch {
      // fallback
    }
    return 'deny';
  }

  async evaluatePathAsync(
    role: string,
    orgUnit: string,
    operation: PathOperation,
    path: string,
  ): Promise<PolicyDecision> {
    const user = new User(role, orgUnit);
    const filePath = new FilePath(path, orgUnit);
    const allowed = await this.oso.isAllowed(user, operation, filePath);
    return allowed ? 'allow' : 'deny';
  }

  requiresApproval(role: string, tool: string): boolean {
    // Check if auto_approve is granted
    try {
      const user = new User(role);
      const toolResource = new Tool(tool);
      const result = this.oso.isAllowedSync?.(user, 'auto_approve', toolResource);
      if (result !== undefined) return !result;
    } catch {
      // fallback
    }
    return true; // default: require approval
  }

  getExecutionMode(role: string): ExecutionMode {
    const config = this.roleConfigs.get(role);
    return (config?.execution_mode as ExecutionMode) ?? 'supervised';
  }

  getTemplateName(role: string): string {
    const config = this.roleConfigs.get(role);
    return (config?.prompt_template as string) ?? 'project-lead';
  }

  getBashOverrides(role: string): BashOverrides {
    const config = this.roleConfigs.get(role);
    const overrides = config?.bash_overrides as
      | { additional_blocked?: string[]; additional_allowed?: string[] }
      | undefined;
    if (!overrides) return {};

    return {
      additionalBlocked: overrides.additional_blocked?.map((p) => new RegExp(p)),
      additionalAllowed: overrides.additional_allowed?.map((p) => new RegExp(p)),
    };
  }

  getTokenBudget(role: string): number {
    const config = this.roleConfigs.get(role);
    return (config?.token_budget_daily as number) ?? -1;
  }
}
