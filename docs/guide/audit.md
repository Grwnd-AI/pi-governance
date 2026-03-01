# Audit Logging

Every governance decision is recorded as a structured JSON event.

## Event types

| Event                | When                                         |
| -------------------- | -------------------------------------------- |
| `session_start`      | Agent session begins                         |
| `session_end`        | Agent session ends (includes summary)        |
| `tool_allowed`       | Tool call passed all checks                  |
| `tool_denied`        | Tool call blocked by policy                  |
| `bash_denied`        | Bash command classified as dangerous         |
| `path_denied`        | File access outside allowed paths            |
| `approval_requested` | HITL approval prompted                       |
| `approval_granted`   | Human approved the action                    |
| `approval_denied`    | Human denied the action                      |
| `tool_dry_run`       | Tool call blocked in dry-run mode            |
| `budget_exceeded`    | Tool call blocked — session budget exhausted |
| `config_reloaded`    | Governance config hot-reloaded successfully  |

## Sinks

Configure one or more audit sinks. Events are written to all configured sinks in parallel.

```yaml
audit:
  sinks:
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl
    - type: webhook
      url: ${AUDIT_WEBHOOK_URL}
```

### Available sinks

| Sink       | Description                            | Configuration        |
| ---------- | -------------------------------------- | -------------------- |
| `jsonl`    | Append-only local JSONL file (default) | `path` — file path   |
| `webhook`  | HTTP POST to a URL                     | `url` — endpoint URL |
| `postgres` | INSERT to a Postgres table             | `connection` — DSN   |

### JSONL sink

The default sink. Writes buffered JSONL (one JSON object per line) to a local file. Buffers are flushed every 10 records or on session end.

```yaml
audit:
  sinks:
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl
```

### Webhook sink

Sends each audit event as an HTTP POST with a JSON body. Useful for centralized logging, SIEM integration, or custom dashboards.

```yaml
audit:
  sinks:
    - type: webhook
      url: https://audit.example.com/api/v1/events
```

### Multi-sink

Use multiple sinks for redundancy or separation of concerns:

```yaml
audit:
  sinks:
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl # Local backup
    - type: webhook
      url: ${AUDIT_WEBHOOK_URL} # Central collection
```

## Session summary

At session end, a `session_end` event is logged with aggregated stats:

```json
{
  "event": "session_end",
  "metadata": {
    "stats": {
      "allowed": 42,
      "denied": 3,
      "approvals": 5,
      "dryRun": 0,
      "budgetExceeded": 0
    },
    "budget": {
      "used": 50,
      "remaining": 499950
    }
  }
}
```

## Querying JSONL logs

The JSONL format is easy to query with standard Unix tools:

```bash
# Count events by type
jq -r '.event' ~/.pi/agent/audit.jsonl | sort | uniq -c | sort -rn

# Find all denied tool calls
jq 'select(.event == "tool_denied")' ~/.pi/agent/audit.jsonl

# Filter by user
jq 'select(.userId == "alice")' ~/.pi/agent/audit.jsonl

# Find budget exceeded events
jq 'select(.event == "budget_exceeded")' ~/.pi/agent/audit.jsonl
```

## Environment variable substitution

Sink URLs support `${VAR_NAME}` syntax, resolved at config load time:

```yaml
audit:
  sinks:
    - type: webhook
      url: ${AUDIT_WEBHOOK_URL}
```

See the [Audit Schema Reference](/reference/audit-schema) for the complete record format.
