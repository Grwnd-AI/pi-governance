# API Reference

TypeScript interfaces for extending pi-governance.

::: warning Work in Progress
This reference will be expanded in Phase 4.
:::

## PolicyEngine

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
type ExecutionMode = 'autonomous' | 'supervised' | 'dry_run';
```

## IdentityProvider

```typescript
interface IdentityProvider {
  name: string;
  resolve(): Promise<ResolvedIdentity | null>;
}

interface ResolvedIdentity {
  userId: string;
  role: string;
  orgUnit: string;
  source: string;
}
```

## FactStore

```typescript
interface FactStore {
  getRoles(userId: string): Promise<RoleBinding[]>;
  getAllRoleBindings(): Promise<RoleBinding[]>;
  getRelations(subject: string, predicate: string): Promise<Relation[]>;
}
```

## AuditSink

```typescript
interface AuditSink {
  write(record: Record<string, unknown>): Promise<void>;
  flush(): Promise<void>;
}
```
