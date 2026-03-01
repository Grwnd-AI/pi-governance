# Audit Schema Reference

Structure of audit log records.

::: warning Work in Progress
This reference will be expanded in Phase 4.
:::

## Record fields

Every audit record contains these base fields:

| Field       | Type     | Description            |
| ----------- | -------- | ---------------------- |
| `timestamp` | `string` | ISO 8601 timestamp     |
| `event`     | `string` | Event type (see below) |
| `sessionId` | `string` | Pi session identifier  |
| `userId`    | `string` | Resolved user identity |
| `role`      | `string` | User's active role     |
| `orgUnit`   | `string` | User's org unit        |

## Event-specific fields

### tool_allowed / tool_denied

| Field    | Type     | Description                                                  |
| -------- | -------- | ------------------------------------------------------------ |
| `tool`   | `string` | Tool name (`read`, `write`, `edit`, `bash`)                  |
| `params` | `object` | Summarized parameters (path, command truncated to 500 chars) |
| `reason` | `string` | Denial reason (denied events only)                           |

### session_end

| Field               | Type     | Description                      |
| ------------------- | -------- | -------------------------------- |
| `toolCallCount`     | `number` | Total tool calls in session      |
| `denialCount`       | `number` | Total denials in session         |
| `sessionDurationMs` | `number` | Session duration in milliseconds |

## Example record

```json
{
  "timestamp": "2026-03-01T14:30:00.000Z",
  "event": "tool_allowed",
  "sessionId": "sess_abc123",
  "userId": "alice",
  "role": "project_lead",
  "orgUnit": "cornerstone_aec",
  "tool": "bash",
  "params": { "tool": "bash", "command": "git status" }
}
```
