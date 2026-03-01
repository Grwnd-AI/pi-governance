# Oso/Polar Policies

Use the Oso authorization engine and Polar language for complex, relational policies.

## When to use Oso

Use Oso instead of YAML when you need:

- Role inheritance (e.g., admin inherits project_lead permissions)
- Relational authorization (e.g., "project leads can write to projects they own")
- Org-unit scoping with hierarchical relationships
- Attribute-based access control
- Dynamic policy evaluation beyond simple allow/block lists

For most teams, the YAML engine is sufficient. Oso is available as an optional upgrade path.

## Setup

Install the optional dependency:

```bash
npm install oso
```

Switch the policy engine in your config:

```yaml
# .pi/governance.yaml
policy:
  engine: oso
  oso:
    polar_files:
      - ./policies/base.polar
      - ./policies/tools.polar
```

## Writing Polar policies

### Basic tool permissions

```polar
# Allow project leads to invoke standard tools
has_permission(user: User, "invoke", tool: Tool) if
  user.role = "project_lead" and
  tool.name in ["read", "write", "edit", "bash", "grep", "find", "ls"];

# Auto-approve read and edit for project leads
has_permission(user: User, "auto_approve", tool: Tool) if
  user.role = "project_lead" and
  tool.name in ["read", "edit", "grep", "find", "ls"];
```

### Role inheritance

```polar
# Admin inherits all project_lead permissions
role_inherits("admin", "project_lead");

has_permission(user: User, action: String, resource) if
  role_inherits(user.role, parent_role) and
  has_permission(new User{role: parent_role}, action, resource);
```

### Path-based access control

```polar
# Project leads can read project files
has_permission(user: User, "read", path: Path) if
  user.role = "project_lead" and
  path.value.starts_with(user.project_path);

# Block secrets for everyone except admin
deny(user: User, _action: String, path: Path) if
  user.role != "admin" and
  path.value.contains("/secrets/");
```

### Org-unit scoping

```polar
# Users can only access resources in their org unit
has_permission(user: User, action: String, resource) if
  user.org_unit = resource.org_unit and
  base_has_permission(user, action, resource);
```

## Fact store integration

Oso policies can use facts from the `FactStore`:

```typescript
import { OsoMemoryFactStore } from '@grwnd/pi-governance';

const store = new OsoMemoryFactStore();
await store.addRoleBinding({ userId: 'alice', role: 'admin', orgUnit: 'platform' });
await store.addRelation({ subject: 'alice', predicate: 'owns', object: 'project-x' });
```

Facts are loaded at session start and can be queried by Polar rules.

## YAML vs Oso comparison

| Feature             | YAML         | Oso/Polar    |
| ------------------- | ------------ | ------------ |
| Simple allow/block  | Yes          | Yes          |
| Path gating         | minimatch    | Custom logic |
| Role inheritance    | No           | Yes          |
| Relational policies | No           | Yes          |
| Org-unit hierarchy  | Flat only    | Hierarchical |
| Setup complexity    | Zero-dep     | Requires oso |
| Policy hot-reload   | Yes          | Yes          |
| Performance         | ~0.02ms/eval | ~0.1ms/eval  |
