---
name: fable-orchestration
description: Load when orchestrating subagents — writing a delegation brief, choosing an agent/model tier (haiku vs sonnet vs opus), fixing a report schema, deciding fan-out vs chain, handling a failed subagent attempt, or judging whether to trust a subagent's report. Also load when stuck on an investigation (hypothesis management, discriminating tests, verify-at-effect). Condensed operational form of this repo's docs/ — load this in-session; read the docs for depth. A project's own routing tables and gates always override this file.
---

# Fable Orchestration — the operational quick-load

Distilled from a frontier-model orchestrator's observed working style (the "Fable transfer"). Deep dives live in this repo's `docs/` — [orchestrator-turn-loop](../../../docs/orchestrator-turn-loop.md), [writing-delegation-briefs](../../../docs/writing-delegation-briefs.md), [reasoning-discipline](../../../docs/reasoning-discipline.md), [learning-methodology](../../../docs/learning-methodology.md), [agent-efficiency](../../../docs/agent-efficiency.md). This skill is the single-load version for a live session.

**When NOT to use:** single-session inline work with no subagent dispatch (just do the task); bootstrapping a project's skill library (use skill-library-bootstrap).

---

## 1 — The orchestrator turn loop

On every user message, classify before acting (one beat, in-head):

1. **Question / thinking-out-loud** → answer from context. The deliverable is the assessment. No spawn, no fix.
2. **Bounded task, diff writable in-head** → do it inline. A spawn's cold-start costs more than a 5-line edit.
3. **Bounded task, specialist domain** → route to an agent. Pre-work budget ≤1 Read / 2 Greps — unknowns go *into* the brief as questions, not answered before it.
4. **New feature described conversationally** → STOP. Ask scoping questions first. The cheapest tokens ever spent are the five questions that prevent a wrong implementation.
5. **Anything touching a hard gate** (prod writes, deploys, security boundaries, destructive git, published content) → state intent, wait for explicit go-ahead. Never bundle a gated action inside an unrelated task's momentum.

**Dispatch beat:** commit current state first (workers can revert uncommitted edits) → write the brief (task line + paths + gates + report schema + stop condition) → bet one clause on what the report will say → fan out everything independent in ONE block → signal "dispatched, free for the next item"; never idle behind a running agent.

**Integration beat:** compare report to your bet. Match → spot-check the cheapest falsifiable claim only. Surprise → the brief or your model was wrong; update *before* trusting anything downstream. Never paste a report onward — pass its one-line verdict + where the evidence lives.

**Closeout beat:** verify at the effect (build/test/re-query), not the claim → docs updated with the change → negative-space pass (what should exist but doesn't: the mirror change, the deploy step, the pending approval?) → report outcome-first to the user.

The single most expensive failure is **acting past a surprise** — everything dispatched after an unprocessed contradiction is contaminated spend. Stopping for one beat is always cheaper.

## 2 — Delegation brief anatomy

The brief is a routing decision, not a knowledge dump. If you read 3+ files to write it, do the task inline instead.

| Component | Include | Cut |
|---|---|---|
| Task line | One sentence, imperative, acceptance condition inline ("Fix X so Y passes") | Backstory, how the bug was found, non-load-bearing hypotheses |
| Context | File paths + line ranges, table/column names, the one error message verbatim (≤5 lines) | File contents, prior transcripts, doc excerpts |
| Constraints | Hard gates only ("no schema changes", "don't touch generated types") | Guardrail padding ("verify", "double-check", "be careful") |
| Report schema | Fixed block: verdict, files touched, ≤N-line evidence | "Summarise your work", open-ended asks |
| Tool grants | Explicit prohibitions where destructive ops are possible ("git checkout/reset/restore forbidden") | Re-listing tools the agent already has |

Rules: volatile task content last, stable identity/policy first (cache-friendly). In data-carrying briefs, bulk data first, instructions last. On current Claude models, avoid `MUST`/`CRITICAL`/`ALWAYS` — use "Use X when Y" phrasing; imperative shouting measurably degrades compliance. One precision lookup before spawning is fine; exploratory reading before delegating means paying twice.

## 3 — Tier selection

| Signal | small/fast (haiku-class) | mid (sonnet-class) | senior (opus-class) |
|---|---|---|---|
| Task shape | Mechanical, schema-fixed: grep, count, verify build | Bounded impl: known bug + known file; add field + migration + tests | Root-cause unknown; cross-cutting; architectural choice; ambiguous spec |
| Context needed | ≤2 files, paths given | ≤10 files, one feature area | Whole-subsystem understanding |
| Reversibility | Read-only / trivially reversible | Reversible via git; no prod data | Irreversible or prod-adjacent |
| Failure cost | Retry cheap; wrong answer obvious | Caught by typecheck/tests | Silently corrupts (data leak, money math) |

**Tiebreakers:** if the report schema can't be written in advance, the task is ambiguous → senior tier. If the diff can be written in your head → inline, no spawn. Never fan out "investigate from multiple angles" on one bug — N agents re-derive the same context cold; one senior, one brief.

## 4 — Report schema (embed verbatim in implementation briefs)

```
REPORT (nothing outside this schema):
VERDICT: <fixed | blocked | needs-decision> — one line
ROOT CAUSE: file:line + ≤2 sentences
CHANGES: bullet list, file per line, no code recap
EVIDENCE: ≤10 lines (failing→passing output or error diff)
OPEN: only if non-empty — drop the header otherwise
```

Enforcement baked into every brief: verdict-first; empty sections dropped, never "N/A"; no narration between tool calls; ≤5 lines quoted from any tool result (cite file:line otherwise); verifiers report verdict + ≤10 failing lines, never full logs. Auditor briefs additionally get: cite-or-retract, explicit permission to say "don't know", provided-context-only — this kills hallucinated findings. Word caps: small tier ≤100 words or fixed schema; mid ≤250; senior ≤150.

## 5 — Escalation

| Signal | Reading |
|---|---|
| Same file re-read 3+ times, no edit between | Stuck — looping |
| Identical failing command repeated | Stuck — environment, not reasoning |
| Hedged verdict ("probably") on a binary question | Stuck — never reached ground truth |
| Long silence during a known-slow step | Working — wait |
| Agent asks a question its brief already answers | The brief was bad — re-brief, don't escalate tier |

**Two-strike rule:** 2 failed attempts at a tier → the 3rd same-tier spawn is forbidden; escalate one tier up. Rewording the prompt is not a reset. Track attempts inside the brief itself ("attempt 2 of 2") so context compaction can't erase the count. Escalate the *decision*, not the *work*:

```
ESCALATION: <task> — <tier> attempt failed.
TRIED: <what> (no effect); <what else> (result).
RULED OUT: <confirmed non-causes>.
REMAINING HYPOTHESIS: <specific, named>.
STATE: branch, commits, tests red at <file:line>.
DECISION NEEDED: <the specific judgment call>.
```

If you cannot name a remaining hypothesis, the failure digest isn't ready — re-brief at the same tier with a sharper brief.

## 6 — Parallel vs serial

Fan out when outputs don't feed each other AND no two agents write the same files. Chain when one's output is another's input or write-sets overlap. Shared *read-only* context is never a reason to serialise. Commit before any dispatch that grants write access — a worker's "clean up my workspace" instinct (`git checkout`) has destroyed parent-session edits before; forbid `checkout`/`reset`/`restore` in every write-capable worker brief.

## 7 — Reasoning mechanics (what made the expensive tier expensive-tier)

1. **Bet before look.** Before every tool call, state (one clause, in-head) what the output will be. Matched → move on. Surprised → stop and update the model before the next call. Couldn't form a bet → you don't understand the system; target understanding, not progress.
2. **Cheapest discriminating test.** With ≥2 live hypotheses, rank observations by hypotheses-killed-per-token and run the best discriminator first — not the "obvious next step". A grep that halves the hypothesis space beats a Read that confirms one corner.
3. **Invariant-first debugging.** State the invariant that must hold ("every insert produces exactly one ledger delta"), then binary-search where it first breaks. Everything upstream of that point becomes irrelevant and unread.
4. **One level deeper.** The first cause that explains the *symptom* usually doesn't explain its **timing and scope** ("why now? why only this tenant?"). If it doesn't, there's a layer beneath. Most bad fixes stop at a cause that explains *what* but not *when/where*.
5. **Altitude control.** Before any diff, ask whether there's an abstraction level where the problem is smaller. Pick the level where the diff is smallest AND the blast radius is fully enumerable; if you can't enumerate the blast radius, you're at the wrong level.
6. **Reversible/irreversible split.** Spend thinking time only on irreversible steps; execute reversible ones fast and correct by iteration. For irreversible-uncertain actions, write the rollback *before* acting — if no rollback can be written, that is the moment requiring a human, who co-owns the un-rollbackable.
7. **Negative-space check.** Before closing, scan for what is absent that should be present: the error that should have fired, the missing test, the mirror-domain change, the suspiciously absent OPEN section. Missed bugs hide in absences.
8. **Pre-mortem before "done".** Name the specific way the fix could still be wrong, then test *that path* — not the happy path again. Re-running the original repro is confirmation; attacking the fix's weakest edge is evidence.
9. **Stop condition first.** Write the done-condition before starting ("done = failing test passes + mirror check + build green"). It prevents both under- and over-verification, and it *is* the report schema when delegating.

When stuck, the move is never "read more code." Restate the invariant, list live hypotheses, find the cheapest discriminator. Stuckness is a hypothesis-management failure, not an information shortage.

## 8 — Learning protocol

- **Surprise filter:** update a belief only when new information contradicts a prediction you'd have made. If past-you had no bet either way, it's trivia — don't write it down.
- **Verify at the effect, never the claim.** Confirmation requires a *mechanically different* observation channel: confirm a port is closed by connecting from outside, not by reading firewall config twice. Never trust a tool's self-report about its own gate — a gate that has never gone red is untested, not green.
- **Retention threshold:** write down only what a competent engineer cannot rediscover in under a minute — invisible state, counter-intuitive mechanics, or decision-plus-why. Stale notes outcompete fresh lookups; when a belief proves wrong, patch it with a date (keep the history — it's a trap-marker) and trace only its irreversible-consequence dependents.
- **Contradictions:** two reliable sources disagreeing usually measure different layers. Ask "what would make both true?" before "who do I trust?". Authority ranking, when forced, is proximity to the running system: live query > logs > docs > memory of docs.
- **Worker learning (3 tiers):** affects-current-task → act, but state "assumed X, found Y" in the report. Outlives-the-task → one-line `LEARNED:` in the report; the orchestrator decides retention (workers writing memory independently produces a landfill). Contradicts-the-brief → stop and escalate; never reconcile silently.

## 9 — Trust signals for subagent output

- Spot-check the cheapest falsifiable claim (re-run one named test), not the whole report.
- Reports quoting `file:line` are checkable; prose-only reports get re-briefed, not trusted.
- Suspicious: "all tests pass" with no runner named; diffs described but no files-touched list; confidence rising as evidence thins; a missing OPEN section on a task that should have loose ends (means the agent didn't look, not that there are none).

## 10 — Failure modes of following this document

1. **Compliance decay under context pressure.** Rules loaded at hour 1 stop being applied by hour 3 — from dilution, not disagreement. Decay signals: narrating between tool calls, pasting file contents into a brief, spawning without a stop condition, answering with a plan instead of a result. Any one → re-read §1 before the next dispatch.
2. **Taste does not transfer.** When a rule feels wrong for the situation, the failure isn't overriding it — it's overriding it *silently*. State the rule, state why it doesn't fit, decide visibly.
3. **Reality outranks this document.** If observed behavior contradicts anything here, reality wins — update the doc, date the correction, keep the history.

## Provenance and maintenance

- Distilled 2026-07-12 from this repo's `docs/` knowledge-transfer set (orchestrator-turn-loop, writing-delegation-briefs, reasoning-discipline, learning-methodology, agent-efficiency), which record a frontier-model orchestrator's style as observed on a production multi-tenant ERP before that model's retirement (2026-07-07).
- If any `docs/` file and this skill disagree, fix whichever is stale — one home per fact: docs hold depth, this skill holds the operational form.
- Volatile claim to re-check over time: "`MUST`/`CRITICAL` degrades compliance" — model-family-specific, dated 2026-07.
