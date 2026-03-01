# Audit Logging

Every governance decision is recorded as a structured JSON event.

::: warning Work in Progress
This guide will be expanded in Phase 4.
:::

## Event types

| Event                | When                                  |
| -------------------- | ------------------------------------- |
| `session_start`      | Agent session begins                  |
| `session_end`        | Agent session ends (includes summary) |
| `tool_allowed`       | Tool call passed all checks           |
| `tool_denied`        | Tool call blocked by policy           |
| `bash_denied`        | Bash command classified as dangerous  |
| `path_denied`        | File access outside allowed paths     |
| `approval_requested` | HITL approval prompted                |
| `approval_granted`   | Human approved the action             |
| `approval_denied`    | Human denied the action               |
| `tool_dry_run`       | Tool call blocked in dry-run mode     |

## Sinks

Configure one or more audit sinks:

```yaml
audit:
  sinks:
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl
    - type: webhook
      url: ${AUDIT_WEBHOOK_URL}
```

### Available sinks

| Sink       | Description                            |
| ---------- | -------------------------------------- |
| `jsonl`    | Append-only local JSONL file (default) |
| `webhook`  | HTTP POST to a URL                     |
| `postgres` | INSERT to a Postgres table             |
