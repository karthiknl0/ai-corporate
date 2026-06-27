# Anti-patterns -- mistakes we made so you don't

Ten patterns that waste tokens, break quality, or create governance gaps. Each one burned us before we fixed it.

---

## 1. Inline specialist work

**Wrong:** "It's just adding one column to the migration, I'll do it inline."
**Why it's bad:** The orchestrator lacks domain context. It writes a migration missing constraints, indexes, or RLS policies. Then it spends 3x the tokens fixing what a specialist would have gotten right the first time.
**Fix:** Always spawn the specialist. The cold-start cost of a haiku worker is less than one retry cycle on the orchestrator.

## 2. Token waste from retries

**Wrong:** A sonnet agent fails to produce valid TypeScript. The orchestrator retries it five times with the same prompt, hoping it works.
**Why it's bad:** Each retry costs full input tokens. By attempt three, you have spent more than an opus call would have cost -- and you still don't have working code.
**Fix:** Two failures on the same agent triggers escalation. Spawn a debugger to diagnose, then re-attempt with new constraints or a stronger model.

## 3. Vanity roles

**Wrong:** Creating a `button-color-specialist` agent because you changed three button colors this week.
**Why it's bad:** Every agent definition adds cognitive load to the routing table. A cold-start spawn costs more than an inline edit. The agent sits unused after the task is done.
**Fix:** If the task takes under 30 seconds and touches one file, do it inline. Create an agent only when the same specialist pattern recurs across multiple sessions.

## 4. All-opus everything

**Wrong:** Using opus to write a migration file, run a typecheck, or update a docs table.
**Why it's bad:** Opus costs 5-15x more than haiku. Migration file writing is mechanical -- it follows a schema spec. Verification is pass/fail. Neither needs reasoning depth.
**Fix:** Match the model to the task. Haiku for mechanical work (migrations, verification, docs updates). Sonnet for domain logic. Opus only for judgment, planning, and architecture decisions.

## 5. Scope creep in agents

**Wrong:** One agent handles database queries, writes the API endpoint, updates the frontend, and runs tests.
**Why it's bad:** The agent's context window fills with irrelevant code. It loses track of earlier decisions. Error diagnosis becomes impossible because you cannot tell which phase failed.
**Fix:** Split into specialist (domain logic) and worker (mechanical execution). Each agent does one thing and reports back. The orchestrator coordinates.

## 6. Empty scaffolding

**Wrong:** Creating a test coverage map, a migration tracking spreadsheet, and a deployment checklist on day one -- before any code exists.
**Why it's bad:** The scaffolding is immediately stale. Every actual change requires updating both the code and the tracking artifact. The tracking artifact adds overhead without adding value until the thing it tracks exists.
**Fix:** Build tracking artifacts on first use. The test coverage map gets created when the first test is written, not before.

## 7. Prose-only governance

**Wrong:** Writing in CLAUDE.md: "Always update docs when changing code." Trusting the AI to follow it.
**Why it's bad:** An AI under token pressure will skip the docs update and rationalize it as "minor change, docs not affected." Prose instructions are suggestions. The AI can reason past them.
**Fix:** Enforce with hooks. A pre-commit gate that checks whether code is staged without a matching doc update cannot be reasoned past. It either blocks the commit or it doesn't.

## 8. Fox guarding the henhouse

**Wrong:** The orchestrator decides whether to route to a specialist or handle it inline. The orchestrator always thinks it can handle it inline.
**Why it's bad:** Self-policing creates a conflict of interest. The orchestrator optimizes for speed (fewer spawns), not quality (correct routing). It will convince itself that "this one is simple enough."
**Fix:** Harness-level enforcement. The pre-commit hook checks which files were touched and which agent touched them. If checkout code was modified without a domain-specialist spawn in the session, the commit is blocked.

## 9. Ignoring the mirror domain

**Wrong:** Fixing a tax calculation bug in the sales flow. Not checking whether the same bug exists in the purchases flow.
**Why it's bad:** Mirror domains share logic patterns. A bug in one almost certainly exists in the other. The user finds the second bug a week later and loses trust in the system.
**Fix:** Every bug fix or feature change triggers a mirror-domain check. If you fix `calculateSalesTax`, grep for `calculatePurchaseTax`. Report what you find. Let the user decide whether to fix both now or later.

## 10. Docs as follow-up

**Wrong:** "Ship the feature now, update docs in the next commit."
**Why it's bad:** The next commit never comes. Or it comes three features later, and the docs are now describing a version of the code that no longer exists. Stale docs are worse than no docs -- they actively mislead.
**Fix:** Pre-commit gate blocks code without paired docs. Same commit, every time. The gate does not care about your intentions for the next commit.

## 11. Worker ignoring orchestrator instructions

**Wrong:** A background agent receives a SendMessage with updated instructions — "add constants to the shared file first, then import everywhere" — but continues with its original approach of hardcoding values in each file.
**Why it's bad:** The orchestrator has to redo the work afterward (wasting the tokens the worker already spent plus the orchestrator's rework tokens). The architectural intent (centralization) is lost if the orchestrator doesn't catch it. In our production system, this happened with a print-styling task: the worker was told to centralize font size constants in a shared tokens file, ignored the instruction, hardcoded sizes in 8 files, and the orchestrator had to redo all 9 files.
**Fix:** Three defenses:
1. **Pre-brief, don't mid-course correct.** Put the architectural direction in the original spawn prompt, not a SendMessage that arrives after the agent is mid-edit.
2. **Log the violation.** Add an entry to `agent-performance-log.json` with result `"violation"` so the pattern is tracked across sessions.
3. **Prefer foreground for architectural tasks.** Background execution is for well-specified mechanical work. If the approach matters more than the speed, run the agent in the foreground so you can verify before it finishes.

## 12. Spawning without verifying output

**Wrong:** Spawning a specialist in the background, receiving the "task complete" notification, and reporting success to the user without checking what actually changed.
**Why it's bad:** The agent's summary describes what it *intended* to do, not necessarily what it *did*. In the worker-ignoring-instructions case above, the summary said "centralized font sizes" but `git diff` showed no changes to the shared constants file.
**Fix:** Always verify subagent output before reporting success. Run `git diff --stat` to see what files changed. Grep for expected patterns (did the constant actually get added? are the imports present?). Trust but verify — the agent summary is a claim, not proof.
