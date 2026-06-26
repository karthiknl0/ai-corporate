# How It Works

A comprehensive guide to how the AI Corporate system operates day-to-day.

---

## 1. Token-Based Cost Optimization

AI Corporate runs on a strict three-tier cost model. Every task is routed to the cheapest model that can handle it.

### The Three Tiers

| Tier | Model | Input $/MTok | Output $/MTok | Role |
|------|-------|-------------|--------------|------|
| **Senior (Opus)** | claude-opus-4-8 | $15 | $75 | Judgment, architecture, approval authority |
| **Specialist (Sonnet)** | claude-sonnet-4-6 | $3 | $15 | Domain expertise, complex implementation |
| **Worker (Haiku)** | claude-haiku-4-5 | $0.25 | $1.25 | Mechanical tasks, verification, grep, docs |

### The Cardinal Rule

Never use Opus for what Sonnet can do. Never use Sonnet for what Haiku can do.

Opus is 12x more expensive than Sonnet on output tokens. Sonnet is 12x more expensive than Haiku. That makes Opus 60x more expensive than Haiku. A migration file that Haiku writes for $0.02 would cost $1.20 on Opus.

### Cold-Start Overhead

Every agent spawn costs approximately 2,000 tokens of overhead (context loading, tool registration, instruction parsing). For tasks under 500 tokens of actual work, spawning a subagent costs more than just doing it inline. The rule: if you can answer with a single grep or file read, do it inline. If the task needs domain context or multiple steps, spawn the specialist.

### Real-World Savings

In production, the tiered model produces roughly 40-50% token savings compared to routing everything through Opus. The savings come from two places:

1. **Haiku workers** handle the bulk of mechanical tasks (verification, linting, grep sweeps, doc updates) at 1/60th the cost of Opus.
2. **Sonnet specialists** handle domain implementation at 1/5th the cost of Opus, and most coding tasks fall in this tier.

### Senior HR Routing

The Senior HR agent evaluates every incoming task and routes it to the cheapest capable tier. This is not optional guidance -- it is a structural decision that determines which model processes the task. The HR agent considers: task complexity, domain requirements, whether judgment or approval authority is needed, and the cost of getting it wrong.

---

## 2. Parallel Multi-Task Execution

AI Corporate defaults to parallel execution. When the orchestrator needs multiple specialists, it spawns them simultaneously rather than waiting for each one to finish.

### Default: Background Execution

All subagent spawns run in the background (`run_in_background: true`). The orchestrator stays free to handle the next task, read user messages, or spawn additional agents while specialists work.

### Simultaneous Specialists

Multiple specialists can run at the same time as long as they operate on non-overlapping domains. A typical parallel dispatch might look like:

```
Orchestrator receives: "Add a new report with edge function and migration"

Spawns in parallel:
  - Nisha (qa-engineer, sonnet)     -> writes test cases
  - Surya (edge-fn-specialist, sonnet) -> implements edge function
  - Manu (migration-writer, haiku)  -> writes migration SQL from spec

All three run simultaneously. Orchestrator continues reading user input.
```

### Domain Exclusion Guard

The system prevents two agents from editing the same file or domain simultaneously. When an agent claims a domain (e.g., "sales module"), other agents are blocked from editing files in that domain until the lock is released. This prevents merge conflicts and silent regressions from concurrent edits.

If the orchestrator needs to spawn two agents that would touch the same domain, it sequences them instead of parallelizing.

### When NOT to Parallelize

- Two agents need the same file
- One agent's output is the other's input (e.g., planner must finish before implementer starts)
- The total token budget is tight and parallel agents would exceed it
- A single inline operation (grep, file read) would be faster than spawning

---

## 3. The Orchestrator Pattern

The main Claude session acts as the "orchestrator." It coordinates work but never performs specialist tasks inline.

### What the Orchestrator Does

1. **Reads** the user's request
2. **Routes** it to the appropriate specialist(s) via the routing table
3. **Verifies** the specialist's output (typecheck, build, tests)
4. **Commits** code and documentation together (enforced by pre-commit gates)
5. **Deploys** if needed (after approval gate)

### What the Orchestrator Does NOT Do

- Write domain-specific code (that is the specialist's job)
- Run complex database queries (spawn the database specialist)
- Debug multi-system issues (spawn the debugger)
- Make architecture decisions (spawn the senior engineer)

The only exception: trivial inline operations that would cost more to delegate than to perform. A single file read, a targeted grep, a quick status check -- these stay with the orchestrator.

### Gate Ownership

The orchestrator holds ALL approval gates:

- **DB writes:** Specialist prepares the SQL; orchestrator gets user approval before executing
- **Deploys:** Specialist writes the code; orchestrator handles deployment after approval
- **Commits:** Orchestrator stages code + docs together and commits
- **Approvals:** Only the orchestrator (or an Opus-tier senior) can approve irreversible actions

Specialists report back. They do not commit, deploy, or write to the database on their own.

---

## 4. Agent Lifecycle

Agents are not static. They are recruited, upgraded, disciplined, and occasionally retired.

### Recruitment

Adding a new agent follows an HR process:

1. **Propose:** Identify a gap in domain coverage or a repeated routing failure
2. **HR Evaluation:** The Senior HR agent (Opus tier) evaluates the proposal:
   - Does an existing agent already cover this domain?
   - Is the proposed model tier the cheapest that can handle the work?
   - Does the definition include clear boundaries and constraints?
   - Is there a routing trigger that would actually invoke this agent?
3. **Decision:** Approved, rejected, or merged into an existing agent's responsibilities

This prevents agent sprawl -- the tendency to create a new specialist for every sub-problem.

### Capability Upgrades

When a domain grows more complex or an agent consistently needs escalation:

1. **Identify the gap:** The agent fails at a specific class of tasks
2. **HR Approval:** Senior HR evaluates whether to upgrade the agent or create a new specialist
3. **Update:** Modify the agent definition with new capabilities, tools, or constraints

### Knowledge Updates

After code changes, affected agent knowledge must be updated:

1. The skill-updater agent audits all agent knowledge files whose domain was touched
2. Stale knowledge is updated to reflect the new code
3. The update is committed alongside the code change (same commit, enforced by pre-commit gate)

This keeps agents from operating on outdated information about the codebase.

### Auto-Escalation

When an agent fails twice at a task, it automatically escalates to the next tier:

```
Haiku (fails x2) --> Sonnet (fails x2) --> Opus
```

Two strikes at a tier triggers mandatory escalation. This prevents cheap models from burning tokens on problems above their capability while ensuring the cheapest viable model gets first attempt.

### Disciplinary Enforcement

The route-guard hook blocks violations in real time:

- An agent tries to edit a file outside its domain: **blocked**, told which specialist to hand off to
- An agent tries to bypass a pre-commit gate: **blocked**, commit rejected
- An agent makes an unapproved DB write: **blocked**, escalated to orchestrator

Violations are logged. Repeated violations can trigger agent definition tightening or retirement.

---

## 5. Pre-Commit Gate Pipeline

Every commit passes through a pipeline of automated checks. Agents cannot bypass these gates -- they are enforced by `.githooks/pre-commit`.

### The Gates

| Gate | Check | Blocks if... |
|------|-------|-------------|
| **1. Docs pairing** | Code changes require matching documentation updates | Code is staged without corresponding doc changes |
| **2. File pairings** | Specific files have mandatory paired updates | A paired file is missing from staging |
| **3. Skill freshness** | Agent knowledge files must have current verification dates | A skill file has a stale `last_verified` date |
| **4. Date-only bump block** | Prevents faking skill verification | Only the date was changed, with no substantive update |
| **5. Typecheck** | TypeScript must pass the project's compiler config | `tsc` reports errors on staged files |
| **6. Deno check** | Edge functions must pass Deno's type checker | `deno check` fails on staged edge functions |
| **7. Tests pass** | Changed modules must have passing tests | Tests fail for staged changes |
| **8. Knowledge update** | Test changes require agent knowledge updates | Test files changed without updating the agent that owns them |

### Why Hooks, Not Guidelines

Advisory guidelines get ignored under token pressure. When an agent is deep in a complex implementation, it will skip documentation "to do later" if nothing stops it. Hook enforcement makes compliance structural, not aspirational.

Every gate that matters is worth blocking commits over. If a rule is not worth enforcing, it is not worth having.

---

## 6. Session Workflow Example

A complete walkthrough of how a typical feature request flows through the system.

### Scenario: User asks for a new inventory report

**Step 1: Orchestrator receives the request**

The orchestrator reads `CLAUDE.md`, checks the routing table, and identifies:
- This is a new feature (not a bug fix or refactor)
- It touches: database (query), frontend (component), possibly edge functions
- Routing: planner first, then domain specialists

**Step 2: Task decomposition**

The orchestrator spawns the planner (Opus tier) to break the feature into sub-tasks:

```
Planner output:
  1. Write the database query/view (postgres specialist)
  2. Create the report component (frontend specialist)
  3. Add edge function if API needed (edge-fn specialist)
  4. Write tests (QA engineer)
  5. Update documentation (docs scribe)
```

**Step 3: Parallel specialist dispatch**

The orchestrator spawns specialists in parallel for non-dependent tasks:

```
Background spawns:
  - Database specialist (sonnet) -> writes the query
  - QA engineer (sonnet) -> writes test cases
  - Docs scribe (haiku) -> prepares doc updates from spec

Sequential (waits for DB specialist):
  - Frontend specialist (sonnet) -> builds the component using the query
  - Edge-fn specialist (sonnet) -> implements the API endpoint
```

**Step 4: Specialists report back**

Each specialist returns its output to the orchestrator. The orchestrator does not merge blindly -- it reviews each output for:
- Does it match the spec?
- Are there conflicts between specialists' outputs?
- Did any specialist flag concerns or ambiguities?

**Step 5: Verification**

The orchestrator runs the verification pipeline:

```
- npm run build          -> compiles without errors
- npm run typecheck      -> TypeScript passes
- npm run test           -> tests pass
- deno check             -> edge functions pass (if applicable)
```

If anything fails, the orchestrator routes the failure back to the responsible specialist.

**Step 6: Commit**

The orchestrator stages code and documentation together (enforced by Gate 1):

```
git add src/reports/InventoryReport.tsx    # code
git add docs/APP-GUIDE.md                  # feature docs
git add .agents/skills/reports.md          # agent knowledge
git commit                                 # pre-commit runs all 8 gates
```

**Step 7: Deploy (if needed)**

If the feature includes an edge function or requires deployment:

1. Orchestrator states intent to deploy
2. Waits for explicit user approval (safety gate)
3. Deploys after approval

**Step 8: Knowledge audit**

The skill-updater agent runs automatically, checking:
- Did this change affect any agent's domain knowledge?
- Are all skill files still accurate?
- Do any routing triggers need updating?

Updates are committed in the same commit as the code change.

---

## Summary

The AI Corporate system works through five interlocking mechanisms:

1. **Cost tiers** ensure every task runs on the cheapest capable model
2. **Parallel execution** keeps the orchestrator free while specialists work
3. **The orchestrator pattern** separates coordination from implementation
4. **Agent lifecycle management** keeps the workforce current and correctly sized
5. **Pre-commit gates** enforce standards that agents cannot bypass

Together, these produce a system where 40-50 agents can work on a production codebase with consistent quality, enforced standards, and optimized cost.
