# Oso/Polar Policies

Use the Oso authorization engine and Polar language for complex, relational policies.

::: warning Work in Progress
This guide will be expanded in Phase 4.
:::

## When to use Oso

Use Oso instead of YAML when you need:

- Role inheritance
- Relational authorization (e.g., "project leads can write to projects they own")
- Org-unit scoping with hierarchical relationships
- Attribute-based access control

## Setup

Install the optional dependency:

```bash
npm install oso
```

Switch the policy engine in your config:

```yaml
policy:
  engine: oso
  oso:
    polar_files:
      - ./policies/base.polar
      - ./policies/tools.polar
```

## Example Polar policy

```polar
# Allow project leads to invoke all standard tools
has_permission(user: User, "invoke", tool: Tool) if
  user.role = "project_lead" and
  tool.name in ["read", "write", "edit", "bash"];

# Auto-approve read and edit for project leads
has_permission(user: User, "auto_approve", tool: Tool) if
  user.role = "project_lead" and
  tool.name in ["read", "edit"];
```
