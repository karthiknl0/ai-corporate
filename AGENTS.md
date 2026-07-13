# AI Corporate Instructions for Codex

This is the Codex-native companion to `CLAUDE.md`. Keep it concise and adapt the commands, domains, and approval rules to the project that installs it.

## Start

1. Read this file and the closest nested `AGENTS.md` before working.
2. Classify the request: direct, mapper, specialist, senior review, or verification.
3. Read only the files needed to decide the next safe action. Use targeted search before broad reads.

## Corporate routing

Every subagent is a named employee. Use the project profiles under `.codex/agents/` when the task matches their role:

| Trigger | Codex agent |
|---|---|
| Cross-cutting design, three or more moving parts, or unclear blast radius | `corporate_architect` (Rajan) |
| Locate ownership, callers, or relevant tests | `code_mapper` (Gita) |
| Bounded implementation after the design is clear | `implementation_specialist` (Mira) |
| Schema, queries, migrations, or data invariants | `data_reviewer` (Priya) |
| Authentication, secrets, permissions, or trust boundaries | `security_reviewer` (Kavya) |
| Build, typecheck, test, lint, or smoke matrix | `verifier` (Anand) |
| Multi-file documentation updates from an approved specification | `docs_scribe` (Saras) |

Give every subagent a short brief with its identity, exact scope, constraints, report schema, and `Done =` condition. Do not ask subagents to commit, deploy, apply migrations, or use destructive Git commands.

## Safety and delivery

- Production writes, migrations, deployments, permission changes, secret/config changes, force pushes, and destructive Git operations require explicit user approval.
- Preserve unrelated edits. Never read or expose secret files unless the user explicitly authorizes the exact access required.
- Run the relevant checks before committing. Stage only task files, then commit focused changes and push only the active feature branch.
- Update durable project guidance when a recurring correction, routing rule, or verification requirement is discovered.

## Codex hooks

`.codex/hooks.json` provides reminders and lifecycle context; it is intentionally not a security boundary. After copying this template into a project, open `/hooks`, review the project hooks, trust them, and start a new Codex task. Codex ignores untrusted project hooks.
