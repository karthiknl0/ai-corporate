# Learning Methodology — How Agents Should Update Their Beliefs

AI agents operating across long sessions and multiple tasks accumulate beliefs about the codebase, system state, and external APIs. Most incoming information is noise. This document describes the discipline for deciding what to update, how to verify it, what to retain, and how workers should surface surprises to the orchestrator.

---

## 1. When to update a belief: the surprise filter

New information triggers a model update only when it *contradicts a prediction you would have made*. Ask: **would past-me have bet wrong on this?**

If yes → update.
If past-me had no bet either way → it is trivia. Do not write it down.

Most incoming information fails this filter. A flaky test that passes on retry contains no new information — the model already contains "tests flake." A disk-full alert from an analytics stack with no configured TTL contradicts "managed storage is stable by default" — that warrants a model update.

This is why a well-maintained project memory stays at ~20 entries, not 500. The filter does the pruning.

---

## 2. How to verify: effect, not claim

To confirm a belief, use a *mechanically different* observation channel. Running the same tool twice is not verification — it re-samples the same potential error.

**Verify at the effect, never at the claim.**

Examples:
- Claim: "the firewall blocks port 5432." Verify: attempt an actual connection from outside the network, not by reading the firewall rules.
- Claim: "the typecheck gate catches errors." Verify: inject a deliberate type error and confirm the gate fires, not by running the checker and seeing exit 0.
- Claim: "the migration was applied." Verify: query the schema directly, not by checking whether the apply command exited cleanly.

**Never trust a tool's self-report about its own gate.** A tool that reports success may be misconfigured to always succeed. The test is whether the tool catches a real failure.

---

## 3. What to retain: the rediscoverable test

Write down what a competent engineer cannot rediscover in under a minute. Three qualifying shapes:

- **Invisible state** — exists nowhere in the repo; without the note, the next agent spends hours debugging something the previous agent already solved
- **Counter-intuitive mechanics** — violates what any competent engineer would assume (e.g., "Docker-published ports bypass this firewall tool")
- **Decision + reasoning** — the decision is greppable in the code, but the *why* is not ("we set TTL to 7 days because the analytics table had no expiry and filled the disk in 11 days")

Do NOT retain:
- Things a grep or docs lookup reproduces in under a minute — those entries go stale and then actively mislead
- Code patterns or conventions — derivable from reading the current codebase
- Git history, recent changes — `git log` is authoritative

**Stale notes outcompete fresh lookups.** A memory entry that was true six months ago and is now wrong is worse than no entry — it costs a debugging session to un-learn it.

---

## 4. Revising beliefs when wrong

The belief itself is cheap to update. The expensive part is everything built on it.

When you discover a belief was wrong:

1. **Patch the note, don't delete it.** Date the correction (`FIXED 2026-06-14`). The history of being wrong is a trap-marker for the next agent.
2. **Ask "what decisions cited this belief?"** Follow the contamination chain to find decisions that were made under the wrong assumption.
3. **Re-verify only prod-adjacent dependents.** Full contamination sweeps are paranoia theater. Targeted sweeps of irreversible or production-adjacent consequences are hygiene.

Do not silently absorb a correction — state it explicitly so the orchestrator can trace the dependent decisions.

---

## 5. Handling contradictions between sources

Two reliable sources disagreeing usually means they are measuring *different things*, not that one is lying.

**Step one is never "who do I trust more."** It is: **what would make both true?**

If you have a firewall rule saying "port blocked" and a network scan saying "port open," the question "which tool is right?" is the wrong question. The right question is "what layers of the stack are each tool observing?" — which is how you find that the application runtime publishes ports directly to the host network, bypassing the firewall rule entirely.

If the contradiction survives that reframe:

- Run the cheapest experiment whose outcome *differs* under each hypothesis
- If experiment is impossible, fall back to authority ranking: **proximity to the running system** (live query > logs > documentation > memory of documentation)
- A memory file loses to a live database query every time

---

## 6. Worker learning protocol

When a subagent (worker or specialist) discovers something unexpected mid-task:

**Tier 1 — affects the current task:**
Act on it, but state the model update explicitly in the report:
```
assumed X, found Y, proceeded under Y
```
Never silently swallow a surprise. A worker's surprise is the orchestrator's contamination signal — the orchestrator needs to know the brief's premise was wrong.

**Tier 2 — outlives the current task (new fact about the codebase or system):**
Do NOT write memory files yourself. Put a one-line entry in the report:
```
LEARNED: <fact that would survive the rediscoverable test>
```
Let the orchestrator decide whether to retain it. Workers lack the cross-session view needed to apply the retention threshold correctly. Fifty agents independently writing memory produces a landfill.

**Tier 3 — contradicts the brief itself:**
Stop and escalate. Do not reconcile the contradiction silently. The agent definition, task spec, or upstream assumption was wrong — that is an orchestrator decision, not a worker decision.

> **Act locally, report the surprise, never persist unilaterally.**

---

## Summary

| Question | Answer |
|---|---|
| Should I update my belief? | Only if past-me would have bet wrong |
| How do I verify it? | Mechanically different channel; verify at the effect |
| Should I write it down? | Only if it fails the rediscoverable test |
| Found it was wrong? | Patch + date the note; trace dependent decisions |
| Two sources disagree? | "What makes both true?" first; then experiment; then proximity-to-system ranking |
| Surprising discovery mid-task? | Tier 1: act + state update · Tier 2: LEARNED in report · Tier 3: stop and escalate |
