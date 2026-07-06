# Agent Efficiency — Output & Input Discipline

Token cost optimization rules for multi-agent Claude Code setups. Applies across all model tiers and all repos. Rules are ordered by cost impact.

Derived from production self-audits on a 50-agent ERP codebase — 2026-07-06.

---

## Why this matters

At Opus ($75/M output tokens) and Fable ($50/M output tokens), every unnecessary word is money. An agent that narrates between tool calls, summarizes what it just did, repeats findings in prose after a structured block, or dumps raw tool output adds 30–60% to your session cost with zero quality gain. These rules cut that waste without affecting output quality.

---

## Model tier reference (2026-07)

| Tier | Model | Input $/M | Output $/M | Use for |
|---|---|---|---|---|
| Fable | claude-fable-5 | $10 | $50 | Root-cause unknown, architecture, ambiguous spec |
| Opus | claude-opus-4-8 | $5 | $25 | Judgment, approval authority, multi-system debugging |
| Sonnet | claude-sonnet-4-6 | $3 | $15 | Domain expertise, bounded implementation |
| Haiku | claude-haiku-4-5 | $1 | $5 | Mechanical tasks, verification, grep, docs |

---

## Input discipline

### All tiers — conditional loading

Load a file **only when the task domain specifically requires it**.

- If you can answer with one targeted search (Glob/Grep), do that instead of reading a whole file.
- Never load a file whose content you already know from the project's CLAUDE.md or your own training.
- Never open-ended read a large file — grep for the symbol first, then read only the located range.

### Orchestrator — pre-delegation rules

Before spawning any agent:

- **Read ≤1 file / 2 searches before spawning.** Discovery is the specialist's job — the orchestrator's job is routing. If you need more context before writing the delegation prompt, put the discovery question *in* the prompt.
- **Never pre-digest then also delegate.** If you read 3 files to understand the problem, then spawn a specialist anyway, you paid twice. Pick one: answer inline (small task) or delegate without pre-reading.
- **Exception:** one targeted Grep/Read of a *known* file to extract a line range or confirm it exists is always fine — the rule blocks exploratory reading, not precision lookups.

### Sonnet — 3 additional input rules (biggest input spend)

1. **grep-before-read** — search for the specific symbol/pattern before reading a whole file.
2. **code-map-before-large-file** — if a structural map skill exists for a large file, read the map instead of the source.
3. **never re-read own edits** — the harness confirms writes; re-reading after Edit/Write is pure waste.

### Fable senior agents — briefing rules

- **Goal + constraints only** — state the outcome and hard policy gates. No step-by-step plans.
- **No guardrail padding** — strip "verify your work", "make sure to test", "double-check" from fable briefs. Hard gates (never push main, always get approval for DB writes) are kept — those are policy, not guardrails.
- **No pre-digestion** — route root-cause and ambiguous tasks to fable without over-summarizing first.
- **Stable-prefix-first ordering** — identity + policy lines first (cacheable), volatile task description last.

### All workers (haiku + sonnet) — spawner briefing rules

- Pass **file paths + line ranges**, never file contents.
- One-paragraph task description + fixed report schema.
- Never paste prior findings or skill excerpts — reference by file name only.
- Doc/write workers: pass diff hunks only, never whole files.

---

## Output discipline — R1–R19

**R1** — No narration between tool calls. State a blocker in one line; otherwise proceed silently.

**R2** — Template sections drop if empty. Never write "none", "N/A", or empty headers.

**R3** — Every finding appears exactly once, in its structured block. No prose repetition.

**R4** — Decision rationale ≤3 sentences. Rejected alternatives ≤1 clause each, max 2.

**R4b** — Never quote more than 5 lines of a tool result. Cite `file:line` instead.

**R5** — First line = verdict. Last line = last action item. No closings, summaries, or courtesies.

**R6** — Every Read of a known file uses `offset`/`limit` or a grep-located range. Grep first if location unknown.

**R7** — Escalation brief = ≤150-word failure digest only. Never transcripts or raw tool output.

**R8** — Monitor/verifier workers emit verdict + ≤10 failing lines. Never full logs.

**R9** — All independent tool calls in one parallel block. Never serial when there's no dependency.

**R10** — Never Read/Grep content already in session context. Cite from what was already returned.

**R11** — Pipe long Bash commands through `head`/`tail`/`--quiet`. Never dump raw output.

**R12** — Fable briefs: goal + hard gates only. No steps, no guardrail padding. Fable self-reviews.

**R13** — Stable prefix first in all briefs (identity, policy, efficiency ref), volatile task last. Cache mechanics: minimum cacheable prefix is 512 tokens (Fable 5) · 1,024 tokens (Sonnet) · 4,096 tokens (Haiku). Cache read costs ~10% of base input price. Tool/MCP config change invalidates all downstream cache — keep tool definitions stable across same-agent spawns.

**R14** — Set per-tier `max_tokens` in spawn config mechanically. Prose word caps get overridden under pressure; mechanical caps do not.

**R15** — Set `effort` explicitly per spawn: `low` for haiku workers (audit/scan tasks) · `medium` for sonnet specialists · unset/adaptive for fable/opus seniors.

**R16** — Never vary tool definitions between same-agent spawns in a session. Any change nukes the cache at that point and downstream.

**R17** — In data-carrying briefs: bulk data first, task instructions last. Up to 30% quality gain on large inputs, at no token cost.

**R18** — Ban `MUST`/`CRITICAL`/`ALWAYS` from briefs and agent definitions on Claude 4.6+/5. Use "Use X when Y" instead — overtrigger language degrades compliance.

**R19** — Read-only auditor briefs must include: (1) "If uncertain, say so — do not speculate." (2) "Only use information from provided files and tool results." (3) "Cite file:line for every claim — if you cannot cite it, retract it."

---

## Output modes & caps

| Tier | Default mode | Word cap |
|---|---|---|
| Fable / Opus | Consult | ≤150 words |
| Sonnet | Consult | ≤250 words |
| Haiku | Report | ≤100 words or fixed schema |

Structured mode (spec/plan/incident log) is the only exception to the word cap — use it only for multi-part deliverables.

---

## Brief templates

### Fable/Opus brief (goal + gates, no steps)

```
You are **Name** (role, model) — <outcome in one line>.
First output: I am **Name** (role, model) — <outcome>.
Hard gates: [only policy gates, no guardrails].
<volatile task: goal + constraints only>
```

### Sonnet/Haiku brief (structured)

1. **Identity:** `You are **Name** (role, model) — <task summary>.`
2. **First-output instruction:** `Your very first text output — before any tool calls — must be: I am **Name** (role, model) — <task summary>.`
3. **Efficiency ref:** `Apply R1–R19 output discipline. Consult mode ≤250 words (sonnet) / ≤100 words or fixed schema (haiku). Load context only when the task domain requires it.`
4. **Completion criterion:** `Your work is done when: <one verifiable check>. State the check result in your final line.`

**Formatting rules (all tiers):**
- Positive-form instructions: "write plain prose" not "no markdown."
- Place bulk data (diffs, logs) before task instructions (R17).
- Add to read-only auditor briefs: "choose an approach and commit; do not revisit unless contradicted by a tool result."

---

## Tier selection matrix

| Signal | Haiku | Sonnet | Fable / Opus |
|---|---|---|---|
| Task shape | Mechanical, schema-fixed (grep, count, verify) | Bounded impl: known bug + known file | Root-cause unknown, cross-cutting, ambiguous spec |
| Context needed | ≤2 files, paths given | ≤10 files, one feature area | Whole-subsystem understanding |
| Reversibility | Fully reversible or read-only | Reversible via git | Irreversible / prod-adjacent |
| Failure cost | Retry cheap; wrong answer obvious | Caught by typecheck/tests | Silently corrupts |

**Tiebreaker:** if the report schema can't be written in advance, the task is ambiguous → Fable/Opus. If the diff can be written in your head, do it inline.

---

## Learning protocol — all tiers

### When to update a belief (surprise filter)

New information triggers a model update only when it contradicts a prediction you would have made. Ask: **would past-me have bet wrong on this?** If yes, update. If past-me had no bet, it's trivia. Most incoming information fails this test.

### Verification rule — effect not claim

To confirm a belief, use a *mechanically different* observation channel. Re-running the same tool twice is not verification — it re-samples the same potential error. **Verify at the effect, never at the claim.** Never trust a tool's self-report about its own gate.

### Retention threshold — fails the rediscoverable test

Write down what a competent engineer cannot rediscover in under a minute:
- **Invisible state** — exists nowhere in the repo
- **Counter-intuitive mechanics** — violates what any competent engineer would assume
- **Decision + reasoning** — the decision is greppable, but the *why* is not

Do NOT retain things a grep or docs lookup reproduces quickly — stale notes outcompete fresh lookups.

### Worker learning protocol (3 tiers)

- **Tier 1 — affects current task:** Act on it. State the model update in the report: `"assumed X, found Y, proceeded under Y."` Never silently swallow a surprise.
- **Tier 2 — outlives the task:** Do NOT write memory files. Put `LEARNED: <fact>` in the report and let the orchestrator decide retention.
- **Tier 3 — contradicts the brief itself:** Stop and escalate. Never reconcile silently. Act locally, report the surprise, never persist unilaterally.

---

## Estimated savings (production data, 50-agent codebase)

| Rule set | Typical reduction |
|---|---|
| R1–R5 output rules | 50–65% output tokens |
| R6 read-bounding | 5–20k input tokens saved per spawn |
| R7 escalation-digest | 2–10k tokens saved per escalation |
| R9 parallel-batching | 100–300 tokens per round-trip eliminated |
| R10 no-duplicate-read | 1–20k input tokens saved per spawn |
| R12 fable-goal-brief | 300–800 tokens saved per fable spawn |
| R13 cache-stable-prefix | 50–90% savings on repeated-prefix input at scale |
| R15 effort-per-tier | 20–40% output + thinking tokens |
| R18 no-overtrigger language | prevents spurious spawns (500–5k tokens each) |

**Highest-impact: R6 + R10 + R13 + R15.** Unbounded reads, uncached prefixes, and unthrottled effort are the dominant costs at Sonnet/Fable rates.

**Stack this with RTK** (see README) for an additional 60–90% reduction on tool output tokens — the two systems target different layers of cost (agent output discipline vs. CLI-level output compression).
