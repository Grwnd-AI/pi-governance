# Quick Start

Get governance running in under 2 minutes.

## Install

```bash
pi install npm:@grwnd/pi-governance
```

On next session start, governance is active with sensible defaults.

## What happens by default

With no configuration file, pi-governance applies these defaults:

| Setting             | Default                                              |
| ------------------- | ---------------------------------------------------- |
| Identity            | Reads `GRWND_USER` and `GRWND_ROLE` from environment |
| Policy engine       | YAML                                                 |
| Execution mode      | Supervised                                           |
| Bash classification | Active — dangerous commands blocked                  |
| Audit               | JSONL to `~/.pi/agent/audit.jsonl`                   |
| Token budget        | Per-role session limit (or unlimited for admin)      |
| Config reload       | Auto-reloads when config file changes                |

## Set your identity

```bash
export GRWND_USER=alice
export GRWND_ROLE=project_lead
export GRWND_ORG_UNIT=default

pi
```

If no identity is set, the extension falls back to the most restrictive role (`analyst`).

## Verify it's working

Inside your Pi session, run:

```
/governance status
```

You should see your user, role, execution mode, budget usage, and session stats.

## Add project-level config

Create `.pi/governance.yaml` in your project root:

```yaml
auth:
  provider: env

policy:
  engine: yaml
  yaml:
    rules_file: ./governance-rules.yaml

hitl:
  default_mode: supervised

audit:
  sinks:
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl
```

Commit this to git so your whole team shares the same governance policy. Changes to this file are automatically detected and reloaded without restarting the session.

## Define your first role

Create `governance-rules.yaml` alongside your config:

```yaml
roles:
  project_lead:
    allowed_tools: [read, write, edit, bash, grep, find, ls]
    blocked_tools: []
    prompt_template: project-lead
    execution_mode: supervised
    human_approval:
      required_for: [bash, write]
      auto_approve: [read, edit, grep, find, ls]
    token_budget_daily: 500000
    allowed_paths:
      - '{{project_path}}/**'
    blocked_paths:
      - '**/secrets/**'
      - '**/.env*'
```

## Decision flow

When a tool call comes in, pi-governance evaluates it through a pipeline:

1. **Dry-run check** — if the role uses `dry_run` mode, block and log
2. **Budget check** — if the session has exceeded its tool invocation limit, block
3. **Policy evaluation** — is this tool allowed for this role?
4. **Bash classification** — if it's a bash command, is it safe/dangerous/needs_review?
5. **Path check** — is the file path within allowed boundaries?
6. **HITL approval** — does this tool require human sign-off?
7. **Allow** — tool call proceeds, audit event logged

## Next steps

- [Define roles and permissions](./yaml-policies.md)
- [Deploy to your team](./team-deployment.md)
- [Customize bash classification](./bash-classifier.md)
- [Set up audit logging](./audit.md)
