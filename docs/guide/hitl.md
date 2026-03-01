# Human-in-the-Loop

Require human approval before sensitive tool calls execute.

## Execution modes

Every role has an `execution_mode` that determines how HITL works:

| Mode         | Behavior                                                 |
| ------------ | -------------------------------------------------------- |
| `autonomous` | No approval needed for any tool call                     |
| `supervised` | Approval required per the role's approval matrix         |
| `dry_run`    | Nothing executes — all tool calls are logged and blocked |

Set the mode in your role definition:

```yaml
roles:
  project_lead:
    execution_mode: supervised
    human_approval:
      required_for: [bash, write]
      auto_approve: [read, edit, grep, find, ls]
```

## Approval matrix

In supervised mode, the approval matrix determines which tools need sign-off:

- **`required_for`** — tools that always require approval. Use `[all]` for everything.
- **`auto_approve`** — tools that skip approval even in supervised mode. Takes precedence over `required_for`.

```yaml
# Analyst: everything needs approval
human_approval:
  required_for: [all]

# Project lead: only bash and write need approval
human_approval:
  required_for: [bash, write]
  auto_approve: [read, edit, grep, find, ls]

# Admin: nothing needs approval
human_approval:
  required_for: []
```

## Approval channels

### CLI (default)

In terminal sessions, the user is prompted directly via Pi's `ctx.ui.confirm()`:

```
[governance] bash: npm install express
  Approve? (y/n, timeout: 300s)
```

Configuration:

```yaml
hitl:
  approval_channel: cli
  timeout_seconds: 300
```

### Webhook

For remote or async approval flows, send requests to a webhook endpoint:

```yaml
hitl:
  approval_channel: webhook
  timeout_seconds: 300
  webhook:
    url: ${GOVERNANCE_WEBHOOK_URL}
```

The webhook receives a POST with the tool call details and user context. It must respond with `{ "approved": true }` or `{ "approved": false, "reason": "..." }` within the timeout.

## Timeout behavior

If no approval is received within the configured timeout (default: 300s, range: 10-3600s), the action is automatically denied and an `approval_denied` audit event is logged.

## Interaction with bash classification

For bash commands in supervised mode, the classifier and HITL work together:

1. **dangerous** commands are blocked immediately — no approval prompt
2. **safe** commands skip HITL if the role auto-approves bash
3. **needs_review** commands are routed to HITL if the role requires approval for bash

This means even in supervised mode, safe commands flow through without interruption while dangerous commands are always blocked.

## Dry-run mode

The `dry_run` execution mode is useful for:

- **Policy testing** — see what would be blocked without actually blocking agents
- **Compliance auditing** — log all tool call intents for review
- **Onboarding** — let new team members see governance in action

In dry-run mode, every tool call is logged as a `tool_dry_run` event and blocked with a clear message. No HITL prompts are shown.
