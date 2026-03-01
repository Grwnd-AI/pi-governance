# Configuration Reference

Full reference for `governance.yaml`.

## Config file resolution

Files are checked in order (first match wins):

1. `$GRWND_GOVERNANCE_CONFIG` environment variable
2. `.pi/governance.yaml` in the current working directory
3. `~/.pi/agent/governance.yaml`
4. Built-in defaults

When loaded from a file, pi-governance watches for changes and automatically reloads. See [Config hot-reload](#config-hot-reload).

## Full schema

```yaml
auth:
  provider: env | local | oidc # Identity provider
  env:
    user_var: GRWND_USER # Env var for username (default)
    role_var: GRWND_ROLE # Env var for role (default)
    org_unit_var: GRWND_ORG_UNIT # Env var for org unit (default)
  local:
    users_file: ./users.yaml # Path to local users YAML

policy:
  engine: yaml | oso # Policy engine type (default: yaml)
  yaml:
    rules_file: ./governance-rules.yaml # Path to role definitions
  oso:
    polar_files: # Paths to Polar policy files
      - ./policies/base.polar
      - ./policies/tools.polar

templates:
  directory: ./templates/ # Custom prompt template directory
  default: project-lead # Fallback template name

hitl:
  default_mode: autonomous | supervised | dry_run # Default: supervised
  approval_channel: cli | webhook # Default: cli
  timeout_seconds: 300 # Range: 10-3600 (default: 300)
  webhook:
    url: ${GOVERNANCE_WEBHOOK_URL} # Required if approval_channel is webhook

audit:
  sinks: # One or more audit destinations
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl # Default JSONL sink
    - type: webhook
      url: ${AUDIT_WEBHOOK_URL}
    - type: postgres
      connection: ${AUDIT_DB_URL}

org_units: # Per-org-unit overrides (optional)
  compliance:
    hitl:
      default_mode: dry_run
    policy:
      extra_polar: ./policies/compliance.polar
      extra_rules: ./rules/compliance.yaml
```

## Section reference

### auth

| Field              | Type     | Default          | Description              |
| ------------------ | -------- | ---------------- | ------------------------ |
| `provider`         | `string` | `env`            | Identity provider type   |
| `env.user_var`     | `string` | `GRWND_USER`     | Env var for user ID      |
| `env.role_var`     | `string` | `GRWND_ROLE`     | Env var for role         |
| `env.org_unit_var` | `string` | `GRWND_ORG_UNIT` | Env var for org unit     |
| `local.users_file` | `string` | `./users.yaml`   | Path to local users file |

### policy

| Field             | Type       | Default                     | Description                   |
| ----------------- | ---------- | --------------------------- | ----------------------------- |
| `engine`          | `string`   | `yaml`                      | `yaml` or `oso`               |
| `yaml.rules_file` | `string`   | `./governance-rules.yaml`   | Path to YAML role definitions |
| `oso.polar_files` | `string[]` | `[base.polar, tools.polar]` | Paths to Polar policy files   |

### templates

| Field       | Type     | Default        | Description               |
| ----------- | -------- | -------------- | ------------------------- |
| `directory` | `string` | `./templates/` | Custom template directory |
| `default`   | `string` | `project-lead` | Fallback template name    |

### hitl

| Field              | Type     | Default      | Description                      |
| ------------------ | -------- | ------------ | -------------------------------- |
| `default_mode`     | `string` | `supervised` | Execution mode                   |
| `approval_channel` | `string` | `cli`        | `cli` or `webhook`               |
| `timeout_seconds`  | `number` | `300`        | Approval timeout (10-3600)       |
| `webhook.url`      | `string` | —            | Webhook URL for remote approvals |

### audit

| Field                | Type     | Default                      | Description                       |
| -------------------- | -------- | ---------------------------- | --------------------------------- |
| `sinks`              | `array`  | `[{type: jsonl, path: ...}]` | Array of sink configs             |
| `sinks[].type`       | `string` | —                            | `jsonl`, `webhook`, or `postgres` |
| `sinks[].path`       | `string` | `~/.pi/agent/audit.jsonl`    | File path (jsonl only)            |
| `sinks[].url`        | `string` | —                            | Endpoint (webhook only)           |
| `sinks[].connection` | `string` | —                            | DSN (postgres only)               |

## Environment variable substitution

Any string value containing `${VAR_NAME}` is resolved from environment variables at load time. If the variable is not set, it resolves to an empty string.

```yaml
audit:
  sinks:
    - type: webhook
      url: ${AUDIT_WEBHOOK_URL} # Resolved from process.env
```

## Config hot-reload

When config is loaded from a file (not built-in defaults), pi-governance watches the file for changes using `fs.watch()`. On change:

1. The file is re-read and parsed
2. The new config is validated against the Typebox schema
3. If valid, the policy engine and bash classifier are recreated
4. A `config_reloaded` audit event is logged
5. If invalid, the current config is kept and a warning is shown

Changes are debounced (500ms) to avoid rapid reloads. The watcher is cleaned up on session shutdown.

## Validation

All config files are validated against a Typebox schema at load time. Invalid configs throw a `ConfigValidationError` with detailed field-level messages:

```
Invalid governance config at .pi/governance.yaml:
  /policy/engine: Expected "yaml" | "oso"
  /hitl/timeout_seconds: Expected number >= 10
```
