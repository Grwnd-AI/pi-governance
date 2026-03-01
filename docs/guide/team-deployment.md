# Team Deployment

Deploy governance across your team using project-local configuration.

::: warning Work in Progress
This guide will be completed in Phase 4. See the [Quick Start](./quickstart.md) for current setup instructions.
:::

## Overview

1. Add `.pi/governance.yaml` and `governance-rules.yaml` to your project root
2. Commit both files to git
3. Each teammate runs `pi install npm:@grwnd/pi-governance`
4. Pi auto-loads the config when teammates start a session in the project directory

## Identity with a local users file

Instead of environment variables, you can map system usernames to roles:

```yaml
# users.yaml
alice:
  role: admin
  org_unit: default

bob:
  role: project_lead
  org_unit: cornerstone_aec

charlie:
  role: analyst
  org_unit: idem
```

```yaml
# .pi/governance.yaml
auth:
  provider: local
  local:
    users_file: ./users.yaml
```
