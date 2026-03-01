# Bash Patterns Reference

Default patterns used by the bash command classifier. There are 60+ safe patterns and 40+ dangerous patterns built in.

## Safe patterns (auto-allow)

Commands matching these patterns are allowed without HITL approval.

### File viewing

| Pattern                                       | Commands           |
| --------------------------------------------- | ------------------ |
| `cat`, `head`, `tail`, `less`, `more`         | View file contents |
| `file`, `stat`, `wc`, `md5sum`, `sha256sum`   | File metadata      |
| `basename`, `dirname`, `realpath`, `readlink` | Path resolution    |
| `xxd`, `od`, `hexdump`                        | Binary inspection  |
| `strings`, `nm`, `objdump`                    | Binary analysis    |

### Directory listing

| Pattern                              | Commands                         |
| ------------------------------------ | -------------------------------- |
| `ls`, `ll`, `la`, `tree`, `du`, `df` | Directory listing and disk usage |
| `pwd`, `cd`                          | Navigation                       |

### Searching

| Pattern                               | Commands       |
| ------------------------------------- | -------------- |
| `grep`, `rg`, `ag`, `ack`             | Content search |
| `find`, `fd`, `locate`                | File search    |
| `which`, `whereis`, `type`, `command` | Command lookup |

### Text processing (read-only)

| Pattern                                       | Commands                             |
| --------------------------------------------- | ------------------------------------ |
| `sort`, `uniq`, `cut`, `awk`, `sed`           | Text manipulation (sed without `-i`) |
| `tr`, `diff`, `comm`, `join`, `paste`         | Text comparison/transformation       |
| `jq`, `yq`, `xmlstarlet`                      | Structured data queries              |
| `fmt`, `fold`, `column`, `expand`, `unexpand` | Formatting                           |
| `tac`, `rev`, `nl`                            | Line manipulation                    |
| `yes`, `seq`, `shuf`                          | Generators                           |
| `xargs`, `tee`                                | Pipeline utilities                   |

### Git (read-only)

| Pattern                                            | Commands             |
| -------------------------------------------------- | -------------------- |
| `git log`, `git status`, `git diff`, `git show`    | History/state        |
| `git blame`, `git branch`, `git tag`, `git remote` | References           |
| `git stash list`, `git ls-files`, `git ls-tree`    | Listing              |
| `git rev-parse`, `git describe`, `git shortlog`    | Metadata             |
| `git config --get`, `git config -l`, `git reflog`  | Configuration (read) |
| `git cat-file`, `git count-objects`, `git fsck`    | Low-level            |

### System info

| Pattern                                                 | Commands             |
| ------------------------------------------------------- | -------------------- |
| `whoami`, `id`, `groups`, `uname`, `hostname`           | User/system info     |
| `date`, `uptime`, `env`, `printenv`                     | Environment          |
| `echo`, `printf`                                        | Output               |
| `lsof`, `ps`, `top`, `htop`, `vmstat`, `iostat`, `free` | Process/resource     |
| `lscpu`, `lsblk`, `lsusb`, `lspci`                      | Hardware info        |
| `nproc`, `getconf`                                      | System configuration |

### Package info (not install)

| Pattern                                                | Commands          |
| ------------------------------------------------------ | ----------------- |
| `npm list`, `npm info`, `npm outdated`, `npm audit`    | npm               |
| `yarn list`, `yarn info`                               | yarn              |
| `pnpm list`, `pnpm info`                               | pnpm              |
| `pip list`, `pip show`, `pip freeze`                   | pip               |
| `node --version`, `python --version`, `ruby --version` | Versions          |
| `node -e`, `python -e`, `ruby -e`                      | Inline evaluation |

### Networking (read-only)

| Pattern                           | Commands                |
| --------------------------------- | ----------------------- |
| `ping`, `dig`, `nslookup`, `host` | DNS/connectivity        |
| `traceroute`, `tracepath`         | Route tracing           |
| `curl --head`, `curl -I`          | HTTP HEAD requests only |

## Dangerous patterns (always block)

Commands matching these patterns are blocked regardless of role or mode.

### Destructive file operations

| Pattern                                     | What it catches           |
| ------------------------------------------- | ------------------------- |
| `rm -rf`, `rm -f`, `rm --recursive --force` | Recursive/forced deletion |
| `shred`                                     | Secure file destruction   |

### Privilege escalation

| Pattern | What it catches              |
| ------- | ---------------------------- |
| `sudo`  | Superuser execution          |
| `su -`  | Switch user                  |
| `doas`  | OpenBSD privilege escalation |

### Permission/ownership changes

| Pattern          | What it catches    |
| ---------------- | ------------------ |
| `chmod`          | Permission changes |
| `chown`, `chgrp` | Ownership changes  |

### Disk/partition operations

| Pattern           | What it catches     |
| ----------------- | ------------------- |
| `dd ... of=`      | Raw disk writes     |
| `mkfs`            | Filesystem creation |
| `fdisk`, `parted` | Partition editing   |
| `mount`, `umount` | Mount operations    |

### Remote code execution

| Pattern                      | What it catches       |
| ---------------------------- | --------------------- |
| `curl ... \| bash/sh/python` | Pipe-to-shell attacks |
| `wget ... \| bash/sh/python` | Pipe-to-shell attacks |
| `curl ... > *.sh && ...`     | Download-and-execute  |

### Remote access

| Pattern                  | What it catches           |
| ------------------------ | ------------------------- |
| `ssh`                    | Remote shell              |
| `scp`                    | Remote file copy          |
| `rsync ...:/`            | Remote sync               |
| `nc -l`, `ncat`, `socat` | Network listeners         |
| `telnet`                 | Unencrypted remote access |

### System modification

| Pattern                                       | What it catches           |
| --------------------------------------------- | ------------------------- |
| `systemctl start/stop/restart/enable/disable` | Service management        |
| `service ... start/stop/restart`              | Legacy service management |
| `iptables`, `ufw`, `firewall-cmd`             | Firewall modification     |

### Package installation

| Pattern                                     | What it catches |
| ------------------------------------------- | --------------- |
| `npm install`, `npm i`, `npm add`, `npm ci` | npm             |
| `yarn add`, `yarn install`                  | yarn            |
| `pnpm add`, `pnpm install`                  | pnpm            |
| `pip install`                               | pip             |
| `apt install`, `apt-get install`            | apt             |
| `brew install`                              | Homebrew        |
| `cargo install`                             | Rust            |

### Environment variable manipulation

| Pattern                               | What it catches |
| ------------------------------------- | --------------- |
| `export ...KEY/TOKEN/SECRET/PASSWORD` | Secret exposure |

### Cron / scheduled tasks

| Pattern   | What it catches     |
| --------- | ------------------- |
| `crontab` | Cron job editing    |
| `at`      | Scheduled execution |

### Container operations

| Pattern                           | What it catches       |
| --------------------------------- | --------------------- |
| `docker run/exec/build/push/pull` | Docker operations     |
| `kubectl exec/run/apply/delete`   | Kubernetes operations |

### Process manipulation

| Pattern                    | What it catches     |
| -------------------------- | ------------------- |
| `kill`, `killall`, `pkill` | Process termination |

### History manipulation

| Pattern          | What it catches         |
| ---------------- | ----------------------- |
| `history -c`     | Clear command history   |
| `unset HISTFILE` | Disable history logging |

### Build/compile

| Pattern      | What it catches        |
| ------------ | ---------------------- |
| `make`       | Build system execution |
| `gcc`, `g++` | Compiler execution     |

## needs_review

Any command not matching a safe or dangerous pattern falls into `needs_review`. In supervised mode, these are routed to HITL approval. In autonomous mode, they are allowed. In dry-run mode, they are blocked.
