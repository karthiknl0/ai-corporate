# Cost Model

A focused guide on the token cost optimization model that drives AI Corporate's tier routing.

---

## Tier Pricing (Claude API, June 2026)

| Tier | Model | Input $/MTok | Output $/MTok | Use for |
|------|-------|-------------|--------------|---------|
| **Senior (Opus)** | claude-opus-4-8 | $15 | $75 | Architecture, judgment, approval, debugging |
| **Specialist (Sonnet)** | claude-sonnet-4-6 | $3 | $15 | Domain expertise, code writing, complex edits |
| **Worker (Haiku)** | claude-haiku-4-5 | $0.25 | $1.25 | Mechanical tasks, verification, grep, docs |

---

## Cost Ratios

Understanding the multipliers between tiers is the key to cost optimization:

- **Opus vs Sonnet (output):** Opus is **5x** more expensive ($75 vs $15)
- **Sonnet vs Haiku (output):** Sonnet is **12x** more expensive ($15 vs $1.25)
- **Opus vs Haiku (output):** Opus is **60x** more expensive ($75 vs $1.25)

A task that costs $0.02 on Haiku would cost $0.24 on Sonnet or $1.20 on Opus. Over hundreds of tasks per session, this adds up fast.

---

## Decision Matrix

| Task Type | Tier | Example Agent | Why This Tier |
|-----------|------|--------------|---------------|
| Read a file, run a grep | **Inline** (no spawn) | Orchestrator | Single known-file lookup; spawn overhead exceeds task cost |
| Run typecheck, lint, verify | **Haiku worker** | Verifier | Mechanical; well-defined input/output; no judgment needed |
| Write migration SQL from spec | **Haiku worker** | Migration writer | Translating a spec to SQL is mechanical when the spec is clear |
| Update documentation from spec | **Haiku worker** | Docs scribe | Following a doc template with provided content |
| Run grep sweeps, compile results | **Haiku worker** | Grep reporter | Pattern matching across files; no interpretation needed |
| Monitor logs, triage errors | **Haiku worker** | Log monitor | Read-only scanning; routes findings to specialists |
| Write domain-specific code | **Sonnet specialist** | Domain specialist | Requires understanding of the domain's patterns and constraints |
| Fix a complex bug | **Sonnet specialist** | Domain specialist | Needs code comprehension and domain context |
| Review code for correctness | **Sonnet specialist** | Code reviewer | Pattern recognition across domain boundaries |
| Map a large file's structure | **Sonnet specialist** | Code mapper | Requires understanding of code architecture |
| Design system architecture | **Opus senior** | Senior engineer | Cross-cutting decisions with high cost of reversal |
| Approve new agent recruitment | **Opus senior** | Senior HR | Organizational judgment; prevents agent sprawl |
| Multi-system root cause analysis | **Opus senior** | Debugger | Complex reasoning across multiple subsystems |
| Production incident triage | **Opus senior** | Incident commander | Judgment calls under pressure; rollback-vs-fix decisions |

---

## Cold-Start Cost

Every agent spawn incurs approximately **2,000 tokens of overhead**:

- Context loading (CLAUDE.md excerpts, agent definition, tool registration)
- Instruction parsing and constraint setup
- Initial orientation (reading relevant files)

This means a task that would take 300 tokens of actual work costs 2,300 tokens when delegated to a subagent. For tasks under ~500 tokens of actual work, inline execution is cheaper.

**Rule of thumb:** If you can answer with one grep or one file read, do it inline. If the task needs domain context, multiple file edits, or specialized knowledge, spawn the specialist.

---

## Anti-Patterns

These are common cost mistakes the system is designed to prevent:

### Using Opus to write a migration file

**Wrong:** Spawn Opus senior to write `ALTER TABLE ADD COLUMN` SQL.
**Right:** Write a clear spec, then spawn the Haiku migration writer. The SQL is mechanical once the spec exists.

**Cost difference:** ~60x more expensive for the same output.

### Using Sonnet to run `npm test`

**Wrong:** Spawn a Sonnet specialist to execute the test suite and report results.
**Right:** Spawn the Haiku verifier. Running tests and reporting pass/fail is mechanical.

**Cost difference:** ~12x more expensive for the same output.

### Spawning any agent for a single grep

**Wrong:** Spawn a Haiku worker to run `grep -r "functionName" src/`.
**Right:** Run the grep inline in the orchestrator. The spawn overhead (2K tokens) exceeds the task cost (~100 tokens).

**Cost difference:** ~20x more expensive due to cold-start overhead.

### Retrying a failed agent three times at the same tier

**Wrong:** Sonnet specialist fails, retry Sonnet, retry Sonnet again, then finally escalate.
**Right:** After two failures at a tier, escalate immediately. Two retries burn tokens on a problem the tier cannot solve.

**Cost difference:** Three failed Sonnet attempts cost 3x before getting the answer from Opus. Auto-escalation after two failures limits waste.

### Spawning Opus "just to be safe"

**Wrong:** Route a straightforward code change to Opus because "it's important."
**Right:** Route to Sonnet. If Sonnet fails twice, auto-escalation handles the upgrade.

The tiered model is designed so that the cheapest viable model gets first attempt. Safety comes from escalation, not from starting at the top.

---

## Savings Breakdown

In a typical production session with mixed tasks:

| Task Category | Count | Tier Used | vs All-Opus Savings |
|--------------|-------|-----------|-------------------|
| Verification runs | ~15 | Haiku | 98% savings per task |
| Doc updates | ~8 | Haiku | 98% savings per task |
| Grep/search | ~20 | Inline | 100% savings (no spawn) |
| Domain code changes | ~10 | Sonnet | 80% savings per task |
| Architecture decisions | ~2 | Opus | 0% (same tier) |
| Bug investigations | ~3 | Sonnet | 80% savings per task |

**Aggregate savings: approximately 40-50%** compared to routing every task through Opus.

The savings are not evenly distributed. They come primarily from the high-volume mechanical tasks (verification, docs, grep) that make up the majority of operations but require no judgment or domain expertise.

---

## Tuning for Your Project

### Start conservative

Begin with a small workforce (5-10 agents) and route most tasks to Sonnet. Add Haiku workers only after you identify repeated mechanical tasks with clear specs.

### Measure before optimizing

Track which agents run most frequently and what they cost. Optimize the high-frequency agents first -- moving a daily verification task from Sonnet to Haiku saves more than optimizing a monthly architecture review.

### Watch for false economy

Some tasks look mechanical but require judgment. If a Haiku worker fails frequently on a task class, it may need Sonnet-level understanding. Persistent escalation on the same task type is a signal to permanently upgrade that routing.

### Budget for cold starts

If your workflow spawns many short-lived agents, the cold-start overhead may dominate actual task cost. Consider batching related small tasks into a single agent session rather than spawning one agent per task.
