<p align="center">
  <img src="assets/logo.png" alt="pi-governance logo" width="180" />
</p>

<h1 align="center">@grwnd/pi-governance</h1>

<p align="center">
  Governance, RBAC, audit, and human-in-the-loop for Pi-based coding agents.
</p>

<p align="center">
  <a href="https://github.com/Grwnd-AI/pi-governance/actions/workflows/ci.yml"><img src="https://github.com/Grwnd-AI/pi-governance/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/@grwnd/pi-governance"><img src="https://img.shields.io/npm/v/@grwnd/pi-governance" alt="npm" /></a>
  <a href="https://github.com/Grwnd-AI/pi-governance/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License" /></a>
  <a href="https://grwnd-ai.github.io/pi-governance/"><img src="https://img.shields.io/badge/docs-GitHub%20Pages-blue" alt="Docs" /></a>
</p>

---

## What is this?

`pi-governance` is a Pi extension that intercepts every tool call your AI coding agent makes and enforces policy before execution. It provides:

- **Role-based access control** — define who can use which tools
- **Bash command classification** — auto-block dangerous commands (`rm -rf`, `sudo`, `curl | sh`)
- **Path-level file gating** — restrict read/write to scoped directories
- **Human-in-the-loop approval** — require sign-off for sensitive operations
- **Audit logging** — structured JSONL logs of every governance decision
- **Prompt-level policy** — role-scoped system prompt templates

It works as a drop-in shim. Install it, and your existing Pi agent gains governance controls without any code changes.

## Quick Start

### Install

```bash
pi install npm:@grwnd/pi-governance
```

That's it. On next session start, governance is active with sensible defaults:

- All tools allowed
- Dangerous bash commands blocked
- Supervised mode (approval required for writes and bash)
- Audit logged to `~/.pi/agent/audit.jsonl`

### Configure

Create `.pi/governance.yaml` in your project root (committed to git for team-wide policy):

```yaml
auth:
  provider: env

policy:
  engine: yaml
  yaml:
    rules_file: ./governance-rules.yaml

hitl:
  default_mode: supervised
  timeout_seconds: 300

audit:
  sinks:
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl
```

### Define Roles

Create `governance-rules.yaml`:

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

  admin:
    allowed_tools: [all]
    blocked_tools: []
    execution_mode: autonomous
    human_approval:
      required_for: []
    allowed_paths: ['**']
    blocked_paths: []
```

### Set Identity

Set environment variables before starting your Pi session:

```bash
export GRWND_USER=alice
export GRWND_ROLE=project_lead
export GRWND_ORG_UNIT=cornerstone_aec

pi
```

Or use a local users file for team setups — see the [docs](https://grwnd-ai.github.io/pi-governance/).

### Check Status

Inside a governed Pi session:

```
/governance status
```

```
Governance active
  User:      alice
  Role:      project_lead
  Org Unit:  cornerstone_aec
  Engine:    yaml
  Mode:      supervised
  Session:   3 tool calls, 0 denials
```

## Architecture

```
User message → Pi Agent Runtime
                    │
              ┌─────┴──────┐
              │ onSessionStart │  ← Identity resolution
              │  → load policy │  ← Select prompt template
              └─────┬──────┘
                    │
              ┌─────┴──────────┐
              │ onBeforeToolCall │  ← RBAC: tool allowed?
              │  → classify bash │  ← Path check
              │  → HITL approval │  ← Audit log
              └─────┬──────────┘
                    │
               allow │ deny
                    │    └→ Return denial message
                    │
              ┌─────┴──────────┐
              │ onAfterToolCall  │  ← Audit result
              └────────────────┘
```

## Dual Policy Engine

Choose between two policy engines:

| Engine             | Best for                                       | Dependency       |
| ------------------ | ---------------------------------------------- | ---------------- |
| **YAML** (default) | Simple setups, quick start                     | Zero — built-in  |
| **Oso/Polar**      | Complex RBAC, relational policies, inheritance | `oso` (optional) |

Switch engines in config:

```yaml
policy:
  engine: oso
  oso:
    polar_files:
      - ./policies/base.polar
      - ./policies/tools.polar
```

## Documentation

Full documentation at **[grwnd-ai.github.io/pi-governance](https://grwnd-ai.github.io/pi-governance/)**.

- [Quick Start](https://grwnd-ai.github.io/pi-governance/guide/quickstart)
- [Team Deployment](https://grwnd-ai.github.io/pi-governance/guide/team-deployment)
- [YAML Policies](https://grwnd-ai.github.io/pi-governance/guide/yaml-policies)
- [Bash Classifier](https://grwnd-ai.github.io/pi-governance/guide/bash-classifier)
- [Configuration Reference](https://grwnd-ai.github.io/pi-governance/reference/config)

## License

[Apache-2.0](LICENSE)
