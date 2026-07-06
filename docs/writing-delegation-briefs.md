# Writing Delegation Briefs

How to write the prompt that spawns a subagent. A good brief routes work to the right specialist with the minimum context. A bad brief either dumps too much (paying for knowledge the agent can discover itself) or too little (the agent guesses wrong and wastes tokens).

---

## The core principle

**A brief is a routing decision, not a knowledge dump.** If you read three or more files to write it, you already understood the problem well enough to do it inline. Either do it inline or delegate without pre-reading.

---

## Orchestrator pre-delegation rules

Before spawning any agent:

- **Read ≤1 file / 2 searches before spawning.** Discovery is the specialist's job. If you need more context before you can write the delegation prompt, put the discovery question *in* the delegation prompt.
- **Never pre-digest then also delegate.** If you read several files to understand the problem and then spawn a specialist anyway, you paid twice — once for your own context loading and once for the specialist's. Pick one: answer inline (small task, no specialist needed) or delegate without reading first.
- **Exception:** one targeted search or read of a *known* file to extract a line range or confirm a file exists is always fine. The rule blocks exploratory reading, not precision lookups.

---

## Brief anatomy

| Component | Include | Cut |
|---|---|---|
| Task line | One sentence, imperative + acceptance condition inline | Background story, hypotheses unless load-bearing |
| Context | File paths + line ranges, table/column names, error message verbatim (≤5 lines) | File contents, prior transcripts, tool output excerpts |
| Constraints | Hard gates only ("no schema changes", "read-only, do not write") | Guardrail padding ("verify", "double-check", "be careful") |
| Report schema | Fixed block: verdict, files-touched, ≤N-line evidence | "Summarise your work", open-ended asks |
| Tool grants | Named explicitly for destructive ops ("git checkout/reset/restore forbidden") | Re-listing tools the agent already has |

---

## Tier selection

Which model to use for a given task:

| Signal | Haiku | Sonnet | Fable / Opus |
|---|---|---|---|
| Task shape | Mechanical, schema-fixed (grep, count, verify build) | Bounded implementation: known bug + known file, add column + migration | Root-cause unknown, cross-cutting, architectural choice, ambiguous spec |
| Context needed | ≤2 files, paths given | ≤10 files, one feature area | Whole-subsystem understanding |
| Reversibility | Fully reversible or read-only | Reversible via git; no prod data | Irreversible / prod-adjacent |
| Failure cost | Retry cheap; wrong answer obvious | Caught by typecheck/tests | Silently corrupts |

**Tiebreaker:** if you cannot write the report schema in advance, the task is ambiguous → route to Fable/Opus. If the diff can be written in your head, do it inline or send to Haiku.

---

## Standard report schema

Embed this verbatim in every implementation brief. It forces the agent to produce checkable evidence instead of prose.

```
REPORT (nothing outside this schema):
VERDICT: <fixed | blocked | needs-decision> — one line
ROOT CAUSE: file:line + ≤2 sentences
CHANGES: bullet list, file per line, no code recap
EVIDENCE: ≤10 lines (failing→passing test output or error diff)
OPEN: only if non-empty — drop the header otherwise
```

Agents that return prose instead of this schema get re-briefed, not trusted.

---

## Escalation handoff brief

When a tier fails twice and you hand off to the next tier up, send this and nothing more. The goal is to pass the *decision*, not the *work history*.

```
ESCALATION: <task-name> — <tier> attempt failed.
TRIED: <what was tried> (no effect); <what else> (result).
RULED OUT: <confirmed non-causes>.
REMAINING HYPOTHESIS: <specific named hypothesis needing senior judgment>.
STATE: branch <name>, <N> commits, tests red at <file:line>.
DECISION NEEDED: <the specific judgment call>.
```

If you cannot name a remaining hypothesis, do not escalate — re-brief at the same tier with the new constraints you learned from the failure.

---

## Fan-out vs serial dispatch

**Fan out** when agent outputs don't feed each other AND no two agents write the same files.

**Chain** when one agent's output is the next agent's input, or their write-sets overlap.

Shared read-only context is never a reason to serialize — two agents can read the same file simultaneously without conflict.

**Commit before any dispatch that grants write access.** A worker that discovers a conflict may issue `git checkout` to clean up, which silently reverts your uncommitted edits.

---

## Worker brief rules

When briefing Haiku workers (docs-scribe, migration-writer, grep-reporter, verifier):

- Pass **file paths + line ranges**, never file contents
- One-paragraph task description + fixed report schema
- Never paste prior findings or skill excerpts — reference by file name only
- For doc/write workers: pass diff hunks only, never whole files

The worker's job is mechanical execution. Everything the worker needs to understand the *what* should be in the file it reads, not in the brief.

---

## Trust signals for subagent output

Before accepting a report as complete:

- Spot-check the cheapest falsifiable claim — re-run one named test, not the whole suite
- Reports with `file:line` citations are checkable; prose-only reports get re-briefed
- **Suspicious signals:** "all tests pass" with no runner named; diffs described but no files-touched list; confidence rising as evidence thins; absent OPEN section on a task that should have loose ends

The agent summary describes what the agent *intended* to do, not necessarily what it *did*. Check `git diff --stat` before reporting success to the user.

---

## Agent definition principles

What goes in a definition file:

- Identity (`Name (role) (model)`)
- Hard tool prohibitions (what the agent cannot do)
- The one non-discoverable domain fact the agent needs to function correctly
- Report schema (fixed block)

What to leave out:

- Step-by-step procedures (they rot faster than code; the agent can reason about steps)
- Tool lists the harness already provides
- Guardrail padding phrases (`MUST`, `CRITICAL`, `ALWAYS`) — these degrade compliance on Claude 4.6+ models; use "Use X when Y" instead

**The definition is a constitution, not a runbook.**
