# OpenClaw Integration

Govern what your OpenClaw agent can do — enforce tool policies, restrict MCP operations, and audit every action.

## How it works

[OpenClaw](https://github.com/Grwnd-AI) uses Pi as its runtime. pi-governance is a Pi extension, so it intercepts **every tool call** OpenClaw makes — including MCP tool calls. This means you can:

- **Allow or block specific MCP tools** per role (e.g., analysts can search but not create reports)
- **Require approval** before sensitive operations (e.g., `create_report`, `upload_asset`)
- **Audit everything** your OpenClaw agent does — structured JSON logs for every tool call
- **Set invocation budgets** to cap how much an agent session can do
- **Classify bash commands** even when OpenClaw shells out

```
┌──────────────────────────────┐
│          OpenClaw             │
│  (MCP tools + agent logic)   │
└──────────┬───────────────────┘
           │ tool_call
           ▼
┌──────────────────────────────┐
│       pi-governance          │
│  policy → budget → audit     │
│  allow / deny / approve      │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│            Pi                │
│    (runtime execution)       │
└──────────────────────────────┘
```

Every MCP tool call flows through pi-governance before Pi executes it. The tool name in your policy rules matches the MCP tool name exactly.

## Quick setup

### 1. Install

```bash
cd your-openclaw-project
pnpm add @grwnd/pi-governance
```

### 2. Create governance config

```yaml
# .pi/governance.yaml
auth:
  provider: env

policy:
  engine: yaml
  yaml:
    rules_file: ./governance-rules.yaml

hitl:
  default_mode: supervised
  timeout_seconds: 120

audit:
  sinks:
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl
```

### 3. Define MCP tool policies

The key: put MCP tool names directly in `allowed_tools` and `blocked_tools`. pi-governance matches the exact tool name from the MCP server.

```yaml
# governance-rules.yaml
roles:
  # Full access — can create reports, upload files, manage templates
  admin:
    allowed_tools: [all]
    blocked_tools: []
    prompt_template: admin
    execution_mode: autonomous
    human_approval:
      required_for: []
    token_budget_daily: -1
    allowed_paths: ['**']
    blocked_paths:
      - '**/.env*'
      - '**/secrets/**'

  # Can generate and edit reports, but not delete or manage templates
  report_author:
    allowed_tools:
      - list_reports
      - get_report
      - create_report
      - get_report_progress
      - list_report_sections
      - get_section_content
      - update_section_content
      - search_report_sections
      - search_documents
      - browse_documents
      - count_documents
      - chat_with_report
      - list_chat_threads
      - generate_asset_key
      - upload_asset
      - list_uploaded_assets
      - list_report_assets
      - get_report_attributes
      - read
      - grep
      - find
      - ls
    blocked_tools:
      - bash
      - write
      - edit
      - delete_template
    prompt_template: project_lead
    execution_mode: supervised
    human_approval:
      required_for:
        - create_report
        - upload_asset
      auto_approve:
        - list_reports
        - get_report
        - search_documents
        - read
    token_budget_daily: 500
    allowed_paths:
      - '{{project_path}}/**'
    blocked_paths:
      - '**/.env*'
      - '**/secrets/**'

  # Read-only — can search and view reports but not create or modify
  analyst:
    allowed_tools:
      - list_reports
      - get_report
      - get_report_progress
      - list_report_sections
      - get_section_content
      - search_report_sections
      - search_documents
      - browse_documents
      - count_documents
      - chat_with_report
      - list_chat_threads
      - get_report_attributes
      - list_report_assets
      - get_template
      - list_templates
      - read
      - grep
      - find
      - ls
    blocked_tools:
      - bash
      - write
      - edit
      - create_report
      - upload_asset
      - update_section_content
      - create_template
      - delete_template
    prompt_template: analyst
    execution_mode: supervised
    human_approval:
      required_for: []
      auto_approve: [all]
    token_budget_daily: 200
    allowed_paths:
      - '{{project_path}}/**'
    blocked_paths:
      - '**/.env*'
      - '**/secrets/**'
```

### 4. Set identity and run

```bash
export GRWND_USER=$(whoami)
export GRWND_ROLE=report_author
export GRWND_ORG_UNIT=engineering
# Start OpenClaw — pi-governance activates automatically
```

## MCP tool reference

These are the MCP tool names you can use in `allowed_tools` and `blocked_tools`. Use the exact names below.

### Reports

| Tool                    | Operation                | Risk  |
| ----------------------- | ------------------------ | ----- |
| `list_reports`          | List all reports         | Read  |
| `get_report`            | Get report details       | Read  |
| `create_report`         | Create a new report      | Write |
| `get_report_progress`   | Check processing status  | Read  |
| `get_report_attributes` | Get extracted attributes | Read  |

### Report sections

| Tool                     | Operation                  | Risk  |
| ------------------------ | -------------------------- | ----- |
| `list_report_sections`   | List section metadata      | Read  |
| `get_section_content`    | Read section content       | Read  |
| `update_section_content` | Edit section content       | Write |
| `search_report_sections` | Search sections by keyword | Read  |

### Documents & search

| Tool               | Operation                   | Risk |
| ------------------ | --------------------------- | ---- |
| `search_documents` | Semantic search across docs | Read |
| `browse_documents` | Paginate through doc chunks | Read |
| `count_documents`  | Count indexed chunks        | Read |

### Chat

| Tool                | Operation           | Risk |
| ------------------- | ------------------- | ---- |
| `chat_with_report`  | Chat about a report | Read |
| `list_chat_threads` | List chat threads   | Read |

### Assets

| Tool                   | Operation               | Risk  |
| ---------------------- | ----------------------- | ----- |
| `generate_asset_key`   | Generate upload key     | Write |
| `upload_asset`         | Upload a file           | Write |
| `list_uploaded_assets` | List uploaded files     | Read  |
| `list_report_assets`   | List report attachments | Read  |
| `download_asset`       | Download an asset       | Read  |

### Templates

| Tool                        | Operation                | Risk        |
| --------------------------- | ------------------------ | ----------- |
| `list_templates`            | List all templates       | Read        |
| `get_template`              | Get template details     | Read        |
| `create_template`           | Create a blank template  | Write       |
| `update_template`           | Update template metadata | Write       |
| `update_template_structure` | Modify template sections | Write       |
| `extract_template`          | AI-extract from document | Write       |
| `duplicate_template`        | Copy a template          | Write       |
| `delete_template`           | Delete a template        | Destructive |

## Audit

Every MCP tool call is logged as structured JSON. This gives you a complete record of what your OpenClaw agent did, when, and for whom.

### Example audit output

```json
{"timestamp":"2026-03-01T10:00:01Z","sessionId":"abc-123","event":"tool_allowed","userId":"alice","role":"report_author","orgUnit":"engineering","tool":"list_reports","input":{}}
{"timestamp":"2026-03-01T10:00:02Z","sessionId":"abc-123","event":"tool_allowed","userId":"alice","role":"report_author","orgUnit":"engineering","tool":"get_report","input":{}}
{"timestamp":"2026-03-01T10:00:05Z","sessionId":"abc-123","event":"approval_requested","userId":"alice","role":"report_author","orgUnit":"engineering","tool":"create_report","input":{}}
{"timestamp":"2026-03-01T10:00:08Z","sessionId":"abc-123","event":"approval_granted","userId":"alice","role":"report_author","orgUnit":"engineering","tool":"create_report","input":{},"duration":3000}
{"timestamp":"2026-03-01T10:00:12Z","sessionId":"abc-123","event":"tool_denied","userId":"alice","role":"report_author","orgUnit":"engineering","tool":"delete_template","decision":"denied","reason":"Policy denies report_author from using delete_template"}
```

### Ship audit to a central endpoint

For production deployments, send audit events to your observability stack:

```yaml
# .pi/governance.yaml
audit:
  sinks:
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl
    - type: webhook
      url: ${AUDIT_WEBHOOK_URL}
```

### Query audit logs

```bash
# What did the agent create today?
cat ~/.pi/agent/audit.jsonl | jq 'select(.tool == "create_report")'

# All denied operations
cat ~/.pi/agent/audit.jsonl | jq 'select(.decision == "denied")'

# Budget usage per session
cat ~/.pi/agent/audit.jsonl | jq 'select(.event == "session_end") | .metadata.budget'
```

## Common patterns

### Approval before report creation

Require human sign-off before the agent creates reports or uploads files, but let it search and read freely:

```yaml
human_approval:
  required_for:
    - create_report
    - upload_asset
    - update_section_content
  auto_approve:
    - list_reports
    - get_report
    - search_documents
    - chat_with_report
```

### Budget-limited research session

Let the agent explore reports but cap the session:

```yaml
researcher:
  allowed_tools:
    - list_reports
    - get_report
    - search_documents
    - browse_documents
    - chat_with_report
    - read
    - grep
  blocked_tools: [bash, write, edit, create_report, upload_asset]
  execution_mode: supervised
  token_budget_daily: 100
```

After 100 tool invocations, all further calls are blocked with a `budget_exceeded` event. Monitor usage with `/governance status`.

### Observation mode

Log what the agent _would_ do without executing anything:

```yaml
observer:
  allowed_tools: [all]
  blocked_tools: []
  execution_mode: dry_run
  token_budget_daily: 1000
```

Every tool call is logged as `tool_dry_run` and blocked. Review the audit trail to understand agent behavior before granting real access.
