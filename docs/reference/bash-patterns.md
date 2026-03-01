# Bash Patterns Reference

Default patterns used by the bash command classifier.

::: warning Work in Progress
Full pattern list will be documented in Phase 4.
:::

## Safe patterns (auto-allow)

Commands matching these patterns are allowed without HITL approval:

- File viewing: `cat`, `head`, `tail`, `less`, `more`
- Directory listing: `ls`, `tree`, `du`, `df`, `pwd`
- Searching: `grep`, `rg`, `find`, `fd`, `locate`
- Text processing: `sort`, `uniq`, `cut`, `jq`, `yq`
- Git (read-only): `git log`, `git status`, `git diff`, `git show`, `git blame`
- System info: `whoami`, `id`, `uname`, `date`, `env`
- Package info: `npm list`, `pip list`, `node --version`

## Dangerous patterns (always block)

Commands matching these patterns are blocked regardless of role:

- Destructive: `rm -rf`, `shred`
- Privilege escalation: `sudo`, `su`, `doas`
- Permissions: `chmod`, `chown`
- Disk operations: `dd of=`, `mkfs`, `fdisk`
- Remote code execution: `curl | sh`, `wget | bash`
- Remote access: `ssh`, `scp`, `nc --listen`
- System modification: `systemctl start/stop`, `iptables`
- Package installation: `npm install`, `pip install`, `brew install`
- Process manipulation: `kill`, `killall`, `pkill`

## needs_review (default)

Any command not matching safe or dangerous patterns falls into `needs_review` and is routed to HITL approval in supervised mode.
