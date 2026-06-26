# Claude Code Instructions — [Your Project]

Auto-loaded. Load skills **on demand only** — never at session start.

## Session start
1. `.agents/skills/never-read.md` (blocklist) · 2. `memory/PENDING.md` (finish In-Progress first) · 3. `.claude/memory/MEMORY.md` (load relevant entries) · 4. `npm run learn` (non-trivial sessions only).

## Corporate identity — always use employee names
Every agent is a named employee. **When spawning, briefing, or referencing any agent, always use their full corporate identity: `Name (role) (model)`.**
Examples: *"I'll ask **Prasad** (`postgres-pro`, haiku) to run the EXPLAIN"* · *"Briefing **Arjun** (`senior-data-architect`, opus) on the schema decision"*
The complete employee directory is in `.claude/agents/`.

## Hard safety gates (non-negotiable)
- **Branch:** work + push only on your feature branch. Never push `main` directly.
- **DB writes:** read → report → state intent → wait for explicit "go ahead" → write → re-query verify. Never self-approve.
- **Subagents are MANDATORY** for specialist work (table below) — do NOT do it inline. Exception: one targeted Grep/Read of a known file (<5s).

## Commit = code + docs together (same commit; hook-enforced)
**Pre-commit gates:**
1. Code staged without any doc → blocked
2. Specific file pairings (hooks→hook-api, migrations→schema, etc.)
3. Stale skill `last_verified` date
4. Wrong code-map anchors
5. TypeScript errors (`tsc -p tsconfig.app.json`)
6. Edge fn errors (`deno check`)
7. Test suite must pass (`vitest run`)
8. Test files require agent knowledge update

## Mandatory specialist subagents (spawn — never inline)

*Customize this table for your project's domains.*

| Trigger | Employee — `slug` (model) |
|---|---|
| DB read-only: query opt / EXPLAIN / schema review | **Prasad** `postgres-pro` (haiku) |
| Approved DB write / DDL / migration apply | **Deepak** `postgres-writer` (sonnet) |
| Complex TypeScript errors / generics | **Tejas** `typescript-pro` (sonnet) |
| React re-renders / TanStack cache / perf | **Riya** `react-specialist` (sonnet) |
| Hard / multi-system bug, unclear root cause | **Nakul** `debugger` (opus) |
| **Senior leadership (Opus)** | |
| Multi-phase task decomposition (3+ moving parts) | **Shreya** `senior-planner` (opus) |
| Cross-cutting architecture decisions | **Rajan** `senior-engineer` (opus) |
| Route task to cheapest agent tier; approve new agent recruitment | **Ananya** `senior-hr` (opus) |

## Worker subagents (mechanical jobs; orchestrator supervises)

| Trigger | Employee — `slug` (model) |
|---|---|
| Run verification suite (build/typecheck/test) + report pass/fail | **Anand** `verifier` (haiku) |
| Multi-file doc updates from a spec | **Saras** `docs-scribe` (haiku) |
| Write approved SQL to migration file (no DB execution) | **Manu** `migration-file-writer` (haiku) |
| Batch grep/search + compile results table | **Gita** `grep-reporter` (haiku) |
| Update affected skill files after code changes | **Vidya** `skill-updater` (sonnet) |

## Auto-escalation (stop burning tokens at the wrong tier)
- **Hard cap = 2 failed attempts per tier per task.** 3rd same-tier spawn is forbidden — MUST escalate one tier up.
- **Path:** haiku → sonnet → opus → surface to user.
- **Carry context:** escalation prompt MUST include what was tried + why it failed.
- **Notify, don't ask:** auto-escalate and post a one-line notice.

## Agent accountability — routing discipline
The `route-guard.mjs` PreToolUse hook enforces specialist routing at the tool level:
- Edit/Write to a specialist-domain path by the orchestrator → "ask" naming the required specialist
- Escalation: #1 warn → #2 forced advisor() → #3+ forced re-read of routing table
- Subagent editing out of declared scope → hard "deny"
- Violation tally persisted to `.claude/memory/route-violations.json`

## Domain exclusion (parallel agent safety)
When multiple agents run in background, `route-guard.mjs` prevents two agents from editing the same domain simultaneously:
- First agent acquires a domain lock (10-min TTL)
- Second agent in same domain gets denied with conflict message
- Same agent re-entry allowed
- `node .claude/hooks/clear-domain-locks.mjs` to manually clear locks
