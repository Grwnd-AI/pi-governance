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

You should see your user, role, execution mode, and session stats.

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

Commit this to git so your whole team shares the same governance policy.

## Next steps

- [Define roles and permissions](./yaml-policies.md)
- [Deploy to your team](./team-deployment.md)
- [Customize bash classification](./bash-classifier.md)
