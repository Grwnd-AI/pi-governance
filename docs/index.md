---
layout: home

hero:
  name: pi-governance
  text: Control Your Coding Agent
  tagline: 'Your coding agent has access to your terminal, filesystem, and secrets. Control what it can do.'
  image:
    src: /logo.png
    alt: pi-governance
  actions:
    - theme: brand
      text: Get Started
      link: /guide/quickstart
    - theme: alt
      text: Why Governance?
      link: /guide/why

features:
  - title: Agents Run Any Bash Command
    details: 'Without controls, your agent can execute rm -rf, curl to external servers, or install malicious packages. pi-governance classifies every command and blocks dangerous ones automatically.'
  - title: Agents Read Your Files
    details: 'Your .env files, API keys, and private keys flow through tool calls to LLM providers. DLP scanning blocks secrets on input and masks PII in output — before they leave your machine.'
  - title: No Audit Trail
    details: "Who ran what, when, and why? Without logging, you can't answer. pi-governance logs every tool call as structured JSON with user, role, decision, and reason."
  - title: Role-Based Controls
    details: 'Define who can do what. Analysts get read-only access. Project leads need approval for writes. Admins run autonomously. Each role has scoped tools, paths, and budgets.'
  - title: Automatic DLP
    details: '15+ secret patterns and 5+ PII patterns detected out of the box. Block API keys in tool inputs, mask credit cards in outputs. Add custom patterns for your organization.'
  - title: Zero-Config Start
    details: "Install and go. One command gives you bash blocking, DLP, supervised mode, and audit logging. Customize when you're ready with YAML or the interactive wizard."
---
