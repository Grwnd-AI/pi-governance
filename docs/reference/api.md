# API Reference

TypeScript interfaces for extending pi-governance.

## PolicyEngine

The core interface for policy evaluation. Two implementations are provided: `YamlPolicyEngine` (default) and an Oso-based engine (optional).

```typescript
interface PolicyEngine {
  evaluateTool(role: string, tool: string): PolicyDecision;
  evaluatePath(
    role: string,
    orgUnit: string,
    operation: PathOperation,
    path: string,
  ): PolicyDecision;
  requiresApproval(role: string, tool: string): boolean;
  getExecutionMode(role: string): ExecutionMode;
  getTemplateName(role: string): string;
  getBashOverrides(role: string): BashOverrides;
  getTokenBudget(role: string): number;
}

type PolicyDecision = 'allow' | 'deny' | 'needs_approval';
type PathOperation = 'read' | 'write';
type ExecutionMode = 'autonomous' | 'supervised' | 'dry_run';

interface BashOverrides {
  additionalBlocked?: RegExp[];
  additionalAllowed?: RegExp[];
}
```

## IdentityProvider

Resolves the current user's identity. Three providers are included: `EnvIdentityProvider`, `LocalIdentityProvider`, and the `IdentityChain` composite.

```typescript
interface IdentityProvider {
  name: string;
  resolve(): Promise<ResolvedIdentity | null>;
}

interface ResolvedIdentity {
  userId: string;
  role: string;
  orgUnit: string;
  source: string; // Which provider resolved this identity
}
```

### IdentityChain

Tries providers in order, returns the first successful resolution. Falls back to `analyst` role if all providers return null.

```typescript
import { createIdentityChain } from '@grwnd/pi-governance';

const chain = createIdentityChain(config.auth);
const identity = await chain.resolve();
// identity.userId, identity.role, identity.orgUnit, identity.source
```

## BashClassifier

Classifies shell commands as safe, dangerous, or needs_review.

```typescript
type BashClassification = 'safe' | 'dangerous' | 'needs_review';

class BashClassifier {
  constructor(overrides?: BashOverrides);
  classify(command: string): BashClassification;
}
```

The classifier checks dangerous patterns on the full command first (catching cross-pipe attacks), then splits on `|`, `&&`, `||`, `;` and classifies each segment. The most restrictive classification wins.

## BudgetTracker

Tracks tool invocation count per session as a proxy for token budget.

```typescript
class BudgetTracker {
  constructor(budget: number); // -1 = unlimited
  consume(amount?: number): boolean; // Returns false if would exceed budget
  remaining(): number; // Infinity if unlimited
  used(): number;
  isUnlimited(): boolean;
}
```

Usage:

```typescript
import { BudgetTracker } from '@grwnd/pi-governance';

const tracker = new BudgetTracker(1000); // 1000 invocations
tracker.consume(); // true — 999 remaining
tracker.consume(5); // true — 994 remaining
tracker.remaining(); // 994
tracker.used(); // 6

const unlimited = new BudgetTracker(-1);
unlimited.isUnlimited(); // true
unlimited.remaining(); // Infinity
```

## ConfigWatcher

Watches a governance config file for changes and triggers validated reloads.

```typescript
class ConfigWatcher {
  constructor(
    configPath: string,
    onChange: (config: GovernanceConfig) => void,
    onError?: (error: Error) => void,
  );
  start(): void;
  stop(): void;
}
```

Uses `fs.watch()` with 500ms debounce. Validates config against the Typebox schema before calling `onChange`. If validation fails, `onError` is called and the current config is kept.

```typescript
import { ConfigWatcher, type GovernanceConfig } from '@grwnd/pi-governance';

const watcher = new ConfigWatcher(
  '.pi/governance.yaml',
  (newConfig) => {
    /* rebuild policy engine */
  },
  (error) => {
    console.warn('Config reload failed:', error.message);
  },
);
watcher.start();
// ... later
watcher.stop();
```

## FactStore

Interface for role bindings and relational facts. Used by the Oso policy engine.

```typescript
interface FactStore {
  getRoles(userId: string): Promise<RoleBinding[]>;
  getAllRoleBindings(): Promise<RoleBinding[]>;
  getRelations(subject: string, predicate: string): Promise<Relation[]>;
}

interface RoleBinding {
  userId: string;
  role: string;
  orgUnit: string;
}

interface Relation {
  subject: string;
  predicate: string;
  object: string;
}
```

Implementations: `YamlFactStore` (file-backed), `OsoMemoryFactStore` (in-memory).

## AuditSink

Interface for audit log destinations.

```typescript
interface AuditSink {
  write(record: Record<string, unknown>): Promise<void>;
  flush(): Promise<void>;
}
```

Built-in sinks: `JsonlAuditSink`, `WebhookAuditSink`.

## AuditLogger

Multi-sink logger that writes to all configured sinks and tracks event counts.

```typescript
class AuditLogger {
  constructor(config?: AuditConfig);
  log(record: Omit<AuditRecord, 'id' | 'timestamp'>): Promise<void>;
  flush(): Promise<void>;
  getSummary(): Map<AuditEventType, number>;
}
```

## ApprovalFlow

Interface for HITL approval channels.

```typescript
interface ApprovalFlow {
  requestApproval(
    toolCall: GovernanceToolCall,
    context: { userId: string; role: string; orgUnit: string },
  ): Promise<ApprovalResult>;
}

interface ApprovalResult {
  approved: boolean;
  reason?: string;
  approver: string;
  duration: number; // Time in milliseconds
}

interface GovernanceToolCall {
  toolName: string;
  input: Record<string, unknown>;
}
```

Implementations: `CliApprover` (terminal prompts), `WebhookApprover` (HTTP-based).

## loadConfig

Loads governance configuration from the file resolution chain.

```typescript
function loadConfig(): { config: GovernanceConfig; source: string };
```

Returns the parsed config and the source path (or `'built-in'` for defaults). Throws `ConfigValidationError` on schema validation failure.
