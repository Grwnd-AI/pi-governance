# Why Governance?

AI coding agents are powerful — they can read files, write code, and run bash commands. That power comes with real risks. Here are four scenarios that pi-governance prevents.

## The Secrets Leak

**What happens:** Your agent reads `.env` to understand project configuration. The file contains `ANTHROPIC_API_KEY=sk-ant-...`. The key is sent as part of the tool result to the LLM provider.

**How pi-governance prevents it:**

```yaml
dlp:
  enabled: true
  on_input: block
  on_output: mask
  built_in:
    secrets: true
```

DLP scans every tool input and output. API keys are detected and blocked before they reach the LLM. The agent sees: "DLP blocked: sensitive data detected (anthropic_api_key)".

## The Accidental rm

**What happens:** Your agent is cleaning up build artifacts and runs `rm -rf ./dist`. But due to a path resolution bug, it actually runs `rm -rf ./` — deleting your entire project.

**How pi-governance prevents it:**

```yaml
roles:
  project_lead:
    execution_mode: supervised
    human_approval:
      required_for: [bash]
```

The bash classifier detects `rm -rf` as dangerous and blocks it automatically. Even "safe" removals require human approval in supervised mode. The agent sees: "Dangerous bash command blocked".

## The Compliance Audit

**What happens:** A regulator asks: "Which AI agents accessed customer data in the last 30 days? What actions did they take?" You have no logs.

**How pi-governance prevents it:**

```yaml
audit:
  sinks:
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl
    - type: webhook
      url: https://audit.example.com/api/v1/events
```

Every tool call is logged as structured JSON — user, role, tool, input, decision, reason, timestamp. Query the audit trail:

```bash
cat ~/.pi/agent/audit.jsonl | jq 'select(.tool == "read" and .input.path | contains("customer"))'
```

## The Rogue Write

**What happens:** A junior developer's agent has the same file access as the developer. It overwrites `production.config.yaml` with a generated configuration that breaks the deployment pipeline.

**How pi-governance prevents it:**

```yaml
roles:
  analyst:
    allowed_tools: [read, grep, find, ls]
    blocked_tools: [write, edit, bash]
    allowed_paths:
      - '{{project_path}}/src/**'
    blocked_paths:
      - '**/config/**'
      - '**/*.config.*'
```

The analyst role cannot write files at all. Path boundaries prevent reading sensitive configuration. The agent sees: "Policy denies analyst from using write".

## Get started

These protections work out of the box with a single install:

```bash
pi install npm:@grwnd/pi-governance
```

See the [Quick Start](./quickstart.md) to get running, or browse [Common Scenarios](./scenarios.md) for copy-paste configurations.
