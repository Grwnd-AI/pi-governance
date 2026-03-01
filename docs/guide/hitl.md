# Human-in-the-Loop

Require human approval before sensitive tool calls execute.

::: warning Work in Progress
This guide will be expanded in Phase 4.
:::

## Execution modes

| Mode         | Behavior                                                 |
| ------------ | -------------------------------------------------------- |
| `autonomous` | No approval needed for any tool call                     |
| `supervised` | Approval required per the role's approval matrix         |
| `dry_run`    | Nothing executes — all tool calls are logged and blocked |

## Approval channels

### CLI (default)

In terminal sessions, the user is prompted directly:

```
[governance] bash: npm install express
  Approve? (y/n, timeout: 300s)
```

### Webhook

For remote/async approval, send requests to a webhook:

```yaml
hitl:
  approval_channel: webhook
  webhook:
    url: ${GOVERNANCE_WEBHOOK_URL}
```

## Timeout

If no approval is received within the configured timeout (default: 300s), the action is denied and logged.
