import type { PolicyEngine } from './engine.js';
import { YamlPolicyEngine } from './yaml-engine.js';

interface PolicyConfig {
  engine?: 'yaml' | 'oso';
  yaml?: { rules_file?: string };
  oso?: { polar_files?: string[] };
}

export async function createPolicyEngine(config?: PolicyConfig): Promise<PolicyEngine> {
  const engine = config?.engine ?? 'yaml';

  if (engine === 'yaml') {
    const rulesFile = config?.yaml?.rules_file ?? './governance-rules.yaml';
    return new YamlPolicyEngine(rulesFile);
  }

  if (engine === 'oso') {
    const { OsoPolicyEngine } = await import('./oso-engine.js');
    const { OsoMemoryFactStore } = await import('../facts/oso-memory-store.js');

    const polarFiles = config?.oso?.polar_files ?? [
      './policies/base.polar',
      './policies/tools.polar',
    ];

    const factStore = new OsoMemoryFactStore();
    return OsoPolicyEngine.create(polarFiles, factStore);
  }

  throw new Error(`Unknown policy engine: ${engine}. Must be 'yaml' or 'oso'.`);
}
