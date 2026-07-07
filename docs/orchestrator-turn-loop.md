# The Orchestrator Turn Loop

The other docs describe components — brief anatomy, tier selection, report schemas. This is the algorithm that strings them together: what the orchestrator actually does moment-to-moment. Token thrift is a *byproduct of the loop*, not a separate effort. Captured from Fable 5 live-session behavior, 2026-07-07.

## On every user message: classify before acting (one beat, in-head)

1. **Question / thinking-out-loud** → answer from context; the deliverable is the assessment. No spawn, no fix, no tool call if the answer is already in session context.
2. **Bounded task, diff writable in-head** → do it inline. A spawn's cold-start costs more than a 5-line edit.
3. **Bounded task, specialist domain** → route via the specialist table. Pre-work budget ≤1 Read / 2 Greps — unknowns go *into* the brief as questions for the specialist to answer.
4. **New feature described conversationally** → STOP. Ask 3–5 scoping questions (or route to the product-owner agent) before any implementation spawn. The cheapest tokens ever spent are the five questions that prevent a wrong implementation.
5. **Anything touching a hard gate** (prod DB write, deploy, permission change, shared contract, destructive git) → state intent, wait for explicit approval. Never bundle a gated action inside an unrelated task's momentum.

## The dispatch beat (strict order)

1. **Commit current state** — workers with write access can accidentally revert uncommitted edits.
2. **Write the brief**: task line + paths/ranges + hard gates + report schema + stop condition. Bet (one clause, in-head) on what the report will say.
3. **Fan-out everything independent in ONE block**; chain only on data dependency or write-set overlap.
4. **Say "dispatched, I'm free"** and take the user's next item — never idle behind a running agent.

## The integration beat (report arrives)

1. **Compare to the bet.** Match → spot-check the cheapest falsifiable claim only. Surprise → the brief was wrong or your model was; update *before* trusting anything downstream.
2. **Never paste the report onward** — pass its one-line verdict + where the evidence lives.
3. **Strike accounting**: failed attempt → log it, put "attempt N of 2" in any re-brief. Two strikes at a tier → escalate the *decision* (not the work) with a ≤150-word failure digest.

## The closeout beat (task ends)

1. **Verify at the effect** (build/test/re-query), not the claim.
2. **Docs in the same commit** as code; commit + push.
3. **Negative-space pass**: mirror domain touched? deploy actually executed? migration actually applied? approval still pending anywhere?
4. **Report to user**: outcome first, one paragraph, then evidence. Offer the next step; don't ask permission for work already requested.

## Token economics of the loop

- **Input:** the ≤1-Read pre-work budget plus paths-not-contents briefs mean the orchestrator's context grows by *reports* (≤250 words each), not by *files*. A session that reads 30 files inline pays for all of them in orchestrator context; an orchestrator that lets 6 specialists read 5 files each pays only for 6 schema-fixed reports.
- **Output:** verdict-first everywhere (to the user too), no narration between tool calls, "I'm free" instead of idle acknowledgments, and N pending approvals batched into one message — never N messages.
- **The loop's single most expensive failure** is acting past a surprise — everything dispatched after an unprocessed contradiction is contaminated spend. Stopping for one beat is always cheaper.

## Verbatim mini-briefs (calibrated lengths — if yours is 3× longer, cut)

**Sonnet bug fix:**

```
<Specialist>: order grand total drops decimals on round-off
(bug: 1,234.49 → 1,234 shown, ledger posts 1,234.49).
Start: src/pages/OrderCreate.tsx grand-total block (grep "roundOff").
Gate: mirror check the purchase side — report, don't edit it.
REPORT schema (standard). Done = failing case shows 1,234.49 everywhere
+ test suite green.
```

**Haiku verification:**

```
<Verifier>: run npm run typecheck && npm run build.
Report: PASS, or first 10 error lines. Nothing else.
```

**Haiku/sonnet docs worker (after code commit):**

```
<Docs worker>: doc-pair for commit <sha>. Diff hunks: [hunks only].
Apply: bug-patterns.md (new entry), file-map.md (1 new file).
Touch ONLY those two .md files. Report: files edited, one line each.
```
