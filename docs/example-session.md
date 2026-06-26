# Example session walkthrough

A realistic session showing the full AI Corporate system in action. We use a generic e-commerce project to illustrate every moving part: planning, parallel execution, gate enforcement, escalation, and cost savings.

---

## The ask

The user types:

```
Add a discount code feature to the checkout
```

## Phase 0: Orchestrator orientation

The orchestrator reads `CLAUDE.md` and identifies:
- This touches the database (new table), checkout logic (domain code), and tests -- a multi-phase task.
- The route-guard in `CLAUDE.md` lists checkout as domain-specialist territory. The orchestrator cannot edit it inline.
- Pre-commit gates require docs alongside code.

The orchestrator's first move is not to code. It spawns a planner.

## Phase 1: Shreya (senior-planner, opus) decomposes the task

```
Agent({
  subagent_type: "senior-planner",
  description: "Decompose discount code feature",
  prompt: "User wants discount codes at checkout. The project has a
    checkout flow in src/checkout/, a Postgres DB with Supabase
    migrations, and Jest tests. Produce an ordered phase+agent plan.
    Include migration, domain logic, tests, and verification."
})
```

Shreya returns a four-phase plan:

```
Phase 1 (background): Migration — new discount_codes table
  → Manu (migration-writer, haiku)

Phase 2 (background, starts with Phase 1): Checkout logic
  → domain specialist (sonnet)
  Depends on: migration file existing (not applied)

Phase 3 (after Phase 2): Tests for discount calculation
  → Nisha (qa-engineer, sonnet)

Phase 4 (after Phase 3): Verification sweep
  → Anand (verifier, haiku)
```

Cost of this planning step: ~0.02 USD (one opus call with focused context). Without it, the orchestrator would have attempted everything sequentially, spending 5x the tokens on false starts.

## Phase 2: Parallel background work

The orchestrator spawns Phases 1 and 2 simultaneously. The user sees a notification that agents are working and is free to ask about something else entirely.

```
Agent({
  subagent_type: "migration-writer",
  description: "Write discount_codes migration",
  prompt: "Create supabase/migrations/<timestamp>_discount_codes.sql.
    Table: discount_codes (id uuid PK, code text unique not null,
    discount_percent numeric check 0-100, valid_from timestamptz,
    valid_until timestamptz, max_uses int, current_uses int default 0,
    created_at timestamptz default now()). Add index on code.
    Do NOT apply — file write only.",
  run_in_background: true
})
```

Manu (haiku) finishes in ~8 seconds. Cost: ~0.003 USD.

Meanwhile, the domain specialist is working on checkout logic:

```
Agent({
  subagent_type: "domain-specialist",
  description: "Implement discount code checkout logic",
  prompt: "Add discount code validation to the checkout flow in
    src/checkout/. Read the existing checkout hook and payment
    calculation. Add: validateDiscountCode(code) that checks the
    discount_codes table, applyDiscount(subtotal, percent) pure
    function, UI input field in CheckoutForm. Use explicit column
    selects, not select('*').",
  run_in_background: true
})
```

### What happens if the user asks a question mid-flight?

The orchestrator handles it immediately. Background agents keep running. The user never waits for an agent to finish before getting help with something else.

```
User: "What's the status of the discount feature?"
Orchestrator: "Manu finished the migration file. The checkout
  specialist is still implementing — about 60% through."
```

## Phase 3: The route-guard in action

Before the domain specialist was spawned, the orchestrator briefly considered doing the checkout edit itself — "it's just adding one input field." The route-guard in `CLAUDE.md` blocks this:

```
# From CLAUDE.md:
# Subagents are MANDATORY for specialist work — do NOT do it inline.
```

If the orchestrator had tried to edit `src/checkout/CheckoutForm.tsx` directly, the pre-commit hook would have flagged it. The system enforces this at two levels: the `CLAUDE.md` instruction (soft) and the commit hook (hard).

## Phase 4: Nisha writes tests

Once the domain specialist finishes, the orchestrator spawns Nisha:

```
Agent({
  subagent_type: "qa-engineer",
  description: "Test discount calculation",
  prompt: "Write tests for the discount code feature.
    Cover: valid code applies correct percentage, expired code
    rejected, max-uses enforcement, zero and 100 percent edge
    cases, code case-insensitivity. The implementation is in
    src/checkout/useDiscountCode.ts and src/checkout/applyDiscount.ts."
})
```

Nisha produces five test cases covering the happy path, expiry, usage limits, and edge cases.

## Phase 5: Anand verifies everything

```
Agent({
  subagent_type: "verifier",
  description: "Run full verification",
  prompt: "Run typecheck (npm run typecheck), tests (npm test),
    and lint. Report pass/fail for each."
})
```

Anand reports:

```
typecheck: PASS (0 errors)
tests:     PASS (5/5 discount tests, 47/47 existing tests)
lint:      PASS
```

## Phase 6: The commit — where gates earn their keep

The orchestrator stages the code and attempts to commit:

```bash
git add src/checkout/ supabase/migrations/20260626_discount_codes.sql
git commit -m "feat: add discount code support to checkout"
```

**Gate 1 fires: docs missing.**

```
PRE-COMMIT HOOK: BLOCKED
Gate 1: Code staged without matching doc update.
  Changed: src/checkout/CheckoutForm.tsx
  Missing: docs/APP-GUIDE.md update for new feature
```

The commit is rejected. The orchestrator now updates the app guide:

```
Agent({
  subagent_type: "docs-scribe",
  description: "Update docs for discount codes",
  prompt: "Add a 'Discount Codes' section to docs/APP-GUIDE.md
    under the Checkout heading. Document: how to create a code,
    how customers apply it, expiry and usage-limit behavior."
})
```

The docs-scribe (haiku) adds the section. The orchestrator re-stages:

```bash
git add docs/APP-GUIDE.md
git commit -m "feat: add discount code support to checkout"
```

Now all gates pass:

```
Gate 1: docs paired       ✓
Gate 7: tests pass         ✓
Gate 8: agent knowledge    ✓
Commit: a3f7b2c feat: add discount code support to checkout
```

The orchestrator pushes:

```bash
git push origin HEAD:codex/session-work
```

## Auto-escalation: what happens when things go wrong

Suppose the domain specialist had failed — maybe it produced code that broke the existing checkout tests. Here is the escalation path:

```
Attempt 1: Domain specialist (sonnet) → tests fail
Attempt 2: Domain specialist (sonnet, with error context) → tests fail again
Escalation: Orchestrator spawns debugger (sonnet) to diagnose
  → Debugger finds the issue: specialist overwrote the tax calculation
  → Orchestrator spawns the specialist a third time with explicit
     constraint: "Do not modify calculateTax, only add discount logic"
  → Tests pass
```

The rule: two failures on the same agent triggers escalation. The orchestrator does not throw the same agent at the same problem a third time without new information.

## Token cost comparison

| Step | Agent | Model | Est. cost |
|---|---|---|---|
| Planning | Shreya | opus | $0.020 |
| Migration file | Manu | haiku | $0.003 |
| Checkout logic | specialist | sonnet | $0.040 |
| Tests | Nisha | sonnet | $0.025 |
| Verification | Anand | haiku | $0.005 |
| Docs update | docs-scribe | haiku | $0.004 |
| Orchestrator overhead | — | sonnet | $0.030 |
| **Total** | | | **~$0.13** |

**All-opus comparison:** Running every step on opus would cost approximately $0.55 — over 4x more — with no improvement in output quality for the mechanical steps (migration writing, verification, docs).

The savings come from matching the model to the task: haiku for mechanical work, sonnet for domain logic, opus only for judgment calls.

---

## What the user actually experienced

1. Typed one sentence.
2. Got a plan summary in ~10 seconds.
3. Worked on something else while agents ran in parallel.
4. Received a clean commit with code, tests, migration, and docs — all passing, all paired.

Total wall-clock time: under 3 minutes. The system handled routing, parallelism, gate enforcement, and doc pairing without the user managing any of it.
