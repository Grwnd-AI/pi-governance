# Configuration Reference

Full reference for `governance.yaml`.

::: warning Work in Progress
This reference will be expanded in Phase 4.
:::

## Config file resolution

Files are checked in order (first match wins):

1. `$GRWND_GOVERNANCE_CONFIG` environment variable
2. `.pi/governance.yaml` in the current working directory
3. `~/.pi/agent/governance.yaml`
4. Built-in defaults

## Full schema

```yaml
auth:
  provider: env | local | oidc
  env:
    user_var: GRWND_USER # env var for username
    role_var: GRWND_ROLE # env var for role
    org_unit_var: GRWND_ORG_UNIT
  local:
    users_file: ./users.yaml

policy:
  engine: yaml | oso
  yaml:
    rules_file: ./governance-rules.yaml
  oso:
    polar_files:
      - ./policies/base.polar

templates:
  directory: ./templates/
  default: project-lead

hitl:
  default_mode: autonomous | supervised | dry_run
  approval_channel: cli | webhook
  timeout_seconds: 300 # 10-3600
  webhook:
    url: ${GOVERNANCE_WEBHOOK_URL}

audit:
  sinks:
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl
    - type: webhook
      url: ${AUDIT_WEBHOOK_URL}
    - type: postgres
      connection: ${AUDIT_DB_URL}

org_units:
  cornerstone_aec:
    hitl:
      default_mode: dry_run
    policy:
      extra_polar: ./policies/cornerstone.polar
```

## Environment variable substitution

Any value containing `${VAR_NAME}` is resolved from environment variables at load time. If the variable is not set, it resolves to an empty string.
