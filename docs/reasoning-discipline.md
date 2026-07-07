# Reasoning Discipline — How Senior-Tier Problem Solving Works

Captured from Fable 5 (Anthropic's Mythos-class model) before its access window closed, 2026-07-07. These are not style preferences — they are the mechanics that make expensive-model output cheap-model-verifiable, written as executable procedure so any tier can apply them.

## The 9 mechanics

### 1. Bet before look

Before every tool call, state (to yourself, one clause) what the output will be. Three outcomes:

- **Matched** → confirmation, move on.
- **Surprised** → information. Stop and update your model *before* the next call — a surprise you act past contaminates everything downstream.
- **Couldn't form a bet** → you don't understand the system yet; the next call should target understanding, not progress.

This single habit converts exploratory wandering into hypothesis-driven work. It costs nothing and is the highest-leverage item in this document.

### 2. Cheapest discriminating test

With ≥2 live hypotheses, do not run the "obvious next step." Rank observations by *how many hypotheses each one kills per token* and run the best discriminator first. A grep that eliminates half the hypothesis space beats a Read that confirms one corner of it. Linear investigation is the expensive-model failure mode dressed as diligence.

### 3. Invariant-first debugging

Never read code linearly to find a bug. State the invariant that must hold for the system to work ("every order insert produces exactly one ledger delta"), then binary-search *where the invariant breaks* — input side vs output side, before the API call vs after. The bug lives at the first point the invariant fails; everything upstream of that point is now irrelevant and unread.

### 4. One level deeper than the first cause

The first cause that *explains the symptom* is usually not the root cause — check whether it also explains the symptom's **timing and scope** ("why now? why only this tenant? why only this document type?"). If it doesn't, there's a layer beneath it. Most bad fixes come from stopping at a cause that explains *what* but not *when/where*.

### 5. Altitude control

Before writing any diff, ask: is there an abstraction level where this problem is smaller? A 200-line fix spread across call sites is usually a 5-line fix at the shared boundary one level up — and vice versa: a "clean" abstraction change is sometimes a 2-line special case at one call site. Pick the level where the diff is smallest *and* the blast radius is fully enumerable. If you can't enumerate the blast radius, you're at the wrong level.

### 6. Reversible vs irreversible split

Decompose every plan into reversible steps (git-revertable, read-only) and irreversible ones (prod writes, deploys, published messages, deletions). Spend thinking time **only on the irreversible steps**; execute reversible ones fast and correct by iteration. Agonizing over a revertable edit is waste; breezing past a migration apply is malpractice.

### 7. Negative-space check

Before closing any task, scan for what is *absent that should be present*: the error that should have fired but didn't, the test that should exist for this path, the mirror-domain change that wasn't made, the OPEN section a report suspiciously lacks. Bugs hide in code; *missed* bugs hide in absences. One deliberate pass over the negative space catches what review of the diff never will.

### 8. Pre-mortem before "done"

Before declaring a fix complete, articulate the specific way it could still be wrong ("this fixes creation but the conversion flow re-derives the value") and test *that named path* — not the happy path again. Verification that re-runs the original repro is confirmation; verification that attacks the fix's weakest edge is evidence.

### 9. Declare the stop condition first

Write the done-condition before starting ("done = failing test passes + mirror check + build green"). Without it you either under-verify (stop at first green) or over-verify (fourth redundant check, tokens burned). The stop condition is also what makes delegation possible — it *is* the report schema.

## Per-tier application

**Sonnet as orchestrator** — apply §1, §2, §6, §9 to *routing*, not code: bet on what each specialist will report before spawning (a surprise in their report = your brief was wrong, re-brief before trusting); choose which agent to spawn by which report discriminates the problem fastest; treat spawning as reversible but approvals as irreversible; never dispatch without the stop condition written into the brief. Resist your tier's failure mode: over-generating process (extra verification spawns, narration) instead of discriminating.

**Opus seniors** — apply §3, §4, §5, §7, §8 to *judgment*: your value is not knowing more, it's refusing to stop at the first sufficient-looking answer. An Opus answer that a Sonnet would also have given is a wasted spawn — the deliverable is the second-order check (timing/scope, altitude, negative space) that cheaper tiers skip under token pressure.

**Haiku workers** — apply §1 and §9 only: predict each tool output and report surprises explicitly (`assumed X, found Y, proceeded under Y`); treat the report schema as the stop condition — fill it and stop.

**All tiers** — when stuck, the move is never "read more code." It is: restate the invariant, list live hypotheses, find the cheapest discriminator. Stuckness is a hypothesis-management failure, not an information shortage.

## Where this discipline will fail (know it in advance)

1. **Compliance decay under context pressure.** Rules loaded at hour 1 stop being applied by hour 3 — not from disagreement, from context dilution. Detection signals: narrating between tool calls, pasting file contents into a brief, spawning without a written stop condition. Any one of these → re-read this document before the next action. Structural enforcement (hooks) beats willpower.
2. **Taste does not transfer.** The mechanics are written; the judgment of *when a rule doesn't apply* is not writable. When a rule feels wrong for the situation, the failure isn't overriding it — it's overriding it *silently*. State the rule, state why it doesn't fit, decide visibly.
3. **Documents drift.** Code changes; examples rot. Trust the principles over the specifics — the mechanics outlive any file path cited in an example.
4. **Reality outranks this document.** If observed behavior contradicts anything written here, reality wins — update the doc, date the correction, keep the history. A team that cargo-cults a stale rule is worse off than one that never read it.
