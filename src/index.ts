// Config
export { type GovernanceConfig } from './lib/config/schema.js';
export { loadConfig, ConfigValidationError } from './lib/config/loader.js';

// Policy engine
export {
  type PolicyEngine,
  type PolicyDecision,
  type PathOperation,
  type ExecutionMode,
  type BashOverrides,
} from './lib/policy/engine.js';
export { YamlPolicyEngine, type YamlRules, type YamlRole } from './lib/policy/yaml-engine.js';
export { createPolicyEngine } from './lib/policy/factory.js';

// Identity
export { type IdentityProvider, type ResolvedIdentity } from './lib/identity/provider.js';
export { EnvIdentityProvider } from './lib/identity/env-provider.js';
export { LocalIdentityProvider } from './lib/identity/local-provider.js';
export { IdentityChain, createIdentityChain } from './lib/identity/chain.js';

// Facts / permissions
export { type FactStore, type RoleBinding, type Relation } from './lib/facts/store.js';
export { YamlFactStore } from './lib/facts/yaml-store.js';
export { OsoMemoryFactStore } from './lib/facts/oso-memory-store.js';

// Bash security
export { type BashClassification, BashClassifier } from './lib/bash/classifier.js';
export { SAFE_PATTERNS, DANGEROUS_PATTERNS } from './lib/bash/patterns.js';

// Templates
export { TemplateSelector, type TemplateSelectorConfig } from './lib/templates/selector.js';
export { render as renderTemplate } from './lib/templates/renderer.js';

// Audit
export { type AuditSink } from './lib/audit/sinks/sink.js';
