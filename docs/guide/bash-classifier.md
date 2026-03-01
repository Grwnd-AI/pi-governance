# Bash Classifier

The bash classifier evaluates every `bash` tool call against pattern lists before execution.

::: warning Work in Progress
This guide will be expanded in Phase 4.
:::

## How it works

Every bash command is classified into one of three categories:

| Category         | Behavior                          | Examples                          |
| ---------------- | --------------------------------- | --------------------------------- |
| **safe**         | Auto-allowed                      | `ls`, `cat`, `grep`, `git status` |
| **dangerous**    | Always blocked                    | `rm -rf`, `sudo`, `curl \| sh`    |
| **needs_review** | Passes to HITL in supervised mode | Unclassified commands             |

## Multi-command handling

Commands chained with `|`, `&&`, `||`, or `;` are split and each segment is classified independently. The most restrictive classification wins.

```bash
# This is classified as "dangerous" because of the second segment
cat file.txt | sudo tee /etc/config
```

## Per-role overrides

Add additional blocked patterns for specific roles in `governance-rules.yaml`:

```yaml
roles:
  project_lead:
    bash_overrides:
      additional_blocked:
        - 'sudo'
        - 'ssh'
        - "curl.*\\|.*sh"
```
