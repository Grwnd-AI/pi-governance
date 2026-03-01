# YAML Policies

Define governance rules using a simple YAML file.

::: warning Work in Progress
This guide will be expanded in Phase 4.
:::

## Basic structure

```yaml
roles:
  analyst:
    allowed_tools: [read]
    blocked_tools: [write, edit, bash]
    execution_mode: supervised
    human_approval:
      required_for: [all]
    allowed_paths:
      - '{{project_path}}/**'
    blocked_paths:
      - '**/secrets/**'
      - '**/.env*'

  project_lead:
    allowed_tools: [read, write, edit, bash]
    blocked_tools: []
    execution_mode: supervised
    human_approval:
      required_for: [bash, write]
      auto_approve: [read, edit]
    allowed_paths:
      - '{{project_path}}/**'
    blocked_paths:
      - '**/secrets/**'
```

## Role fields

| Field                         | Type       | Description                                              |
| ----------------------------- | ---------- | -------------------------------------------------------- |
| `allowed_tools`               | `string[]` | Tools this role can use. Use `[all]` for unrestricted.   |
| `blocked_tools`               | `string[]` | Tools explicitly denied (overrides allowed).             |
| `execution_mode`              | `string`   | `autonomous`, `supervised`, or `dry_run`                 |
| `human_approval.required_for` | `string[]` | Tools requiring human approval. `[all]` for everything.  |
| `human_approval.auto_approve` | `string[]` | Tools that skip approval even in supervised mode.        |
| `allowed_paths`               | `string[]` | Glob patterns for permitted file access.                 |
| `blocked_paths`               | `string[]` | Glob patterns for denied file access (takes precedence). |
| `token_budget_daily`          | `number`   | Max tokens per day. `-1` for unlimited.                  |
