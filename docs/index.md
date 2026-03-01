---
layout: home

hero:
  name: pi-governance
  text: Governance for AI Coding Agents
  tagline: Role-based access control, bash classification, audit logging, and human-in-the-loop — as a drop-in Pi extension.
  image:
    src: /logo.png
    alt: pi-governance
  actions:
    - theme: brand
      text: Quick Start
      link: /guide/quickstart
    - theme: alt
      text: View on GitHub
      link: https://github.com/Grwnd-AI/pi-governance

features:
  - icon: "\U0001F6E1\uFE0F"
    title: Role-Based Access Control
    details: Define roles (analyst, project_lead, admin) with per-tool permissions, path scoping, and org-unit boundaries.
  - icon: "\U0001F6AB"
    title: Bash Command Classification
    details: 60+ regex patterns auto-classify commands as safe, dangerous, or needs-review. Dangerous commands are blocked before execution.
  - icon: "\U0001F4DD"
    title: Audit Logging
    details: Every governance decision is logged as structured JSON. Ship to JSONL files, webhooks, or Postgres.
  - icon: "\u2705"
    title: Human-in-the-Loop
    details: Require approval for sensitive operations. CLI prompts or webhook-based approval flows with configurable timeouts.
  - icon: "\U0001F4B0"
    title: Token Budget Enforcement
    details: Set per-role tool invocation limits. Sessions are automatically capped when the budget is exhausted.
  - icon: "\U0001F504"
    title: Config Hot-Reload
    details: Edit your governance YAML and see changes applied instantly — no session restart needed.
  - icon: "\U0001F4C4"
    title: Prompt-Level Policy
    details: Role-scoped system prompt templates constrain agent behavior at the model level — not just tool gating.
  - icon: "\u2699\uFE0F"
    title: Zero-Config Start
    details: Install and go. Sensible defaults block dangerous bash, enable supervised mode, and log to JSONL out of the box.
---
