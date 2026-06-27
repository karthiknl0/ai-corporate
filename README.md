# AI Corporate

**Corporate governance for AI coding agents.**

Run your AI agents like a company. Named employees, specialist routing, HR approval, disciplinary hooks, and cost-tier optimization.

![AI Corporate — Agent Workforce](assets/org-chart-preview.svg)

---

## Why?

Multi-agent AI coding systems have a scaling problem. Once you move beyond a single assistant, you run into questions that software teams solved decades ago:

- **Who handles what?** Without routing rules, every agent tries to do everything — badly.
- **Who's allowed to touch what?** Without domain boundaries, two agents edit the same file and create merge conflicts or silent regressions.
- **How do you control cost?** Sending every task to your most capable (and most expensive) model wastes money on work a cheaper model handles fine.
- **How do you enforce standards?** Without pre-commit gates, agents skip documentation, ignore type errors, and bypass specialist knowledge.

AI Corporate treats these as organizational problems, not technical ones. It gives your agents job titles, reporting lines, domain ownership, and disciplinary enforcement — the same structures that make human engineering teams function.

This framework was battle-tested on a production ERP system with 47 AI agents across 3 model tiers before being extracted as a reusable package.

---

## Key Features

### Named Employee System

Every agent has a name, a role, and a model tier. No more `agent-1` or `helper-bot`. Each employee has a definition file specifying their capabilities, tools, and constraints.

```
agents/
  postgres-pro.md         # Priya (sonnet) — read-only DB specialist
  senior-engineer.md      # Vikram (opus) — cross-cutting architecture
  verifier.md             # Deepa (haiku) — build/test runner
  ...
```

Three tiers map to cost and capability:

| Tier | Role | When to use |
|------|------|-------------|
| **Opus** | Senior leadership | Judgment calls, architecture, approval authority |
| **Sonnet** | Specialists | Domain expertise, complex implementation |
| **Haiku** | Workers | Mechanical tasks, grep, verification, docs |

### Mandatory Specialist Routing

A routing table in `CLAUDE.md` maps triggers to the right specialist. The orchestrating agent must delegate — it cannot do the work inline.

```markdown
| Trigger                  | Agent              |
|--------------------------|--------------------|
| DB query / schema change | postgres-pro       |
| Complex TS errors        | typescript-pro     |
| Security audit           | security-auditor   |
| React re-renders         | react-specialist   |
```

This prevents the generalist agent from attempting work it lacks context for. A route-guard hook enforces it at runtime.

### 8 Pre-Commit Gates

A `.githooks/pre-commit` script runs 8 checks before any commit lands:

1. **Docs pairing** — code changes require matching documentation updates
2. **Typecheck** — staged TypeScript must pass the project's `tsc` config
3. **Skill freshness** — agent knowledge files must not have stale verification dates
4. **Date-only bump block** — prevents agents from faking skill verification by just updating a date
5. **Code-map pairing** — large files (1,500+ lines) must have a paired structural map
6. **Code-map anchor check** — structural anchors in maps must match actual source
7. **Edge function check** — Deno files must pass `deno check`
8. **Test gate** — enforced test coverage for changed modules

### Route-Guard Hook

A `PreToolUse` hook intercepts file edits in real time. If an agent tries to edit a file that belongs to a specialist domain, the hook blocks the edit and tells the agent which specialist to spawn instead.

This is not advisory — it is enforced. The agent literally cannot write to the file without routing through the specialist.

### Auto-Escalation

When an agent fails twice at a task, it automatically escalates to the next tier up:

```
haiku (fails) --> sonnet (fails) --> opus
```

Two strikes at a tier triggers mandatory escalation. This prevents cheap models from burning tokens on problems above their capability.

### Domain Exclusion

File-level locking prevents two agents from editing the same domain simultaneously. When an agent claims a file, other agents are blocked until the lock is released. A utility script handles manual lock clearing when needed.

### HR Recruitment

Adding a new agent to the workforce is not free. Every new employee proposal goes through an HR evaluation that checks:

- Does an existing agent already cover this domain?
- Is the proposed model tier the cheapest that can handle the work?
- Does the agent definition include clear boundaries and constraints?
- Is there a routing trigger that would actually invoke this agent?

This prevents agent sprawl — the tendency to create a new specialist for every minor sub-problem.

### Cost Optimization

The three-tier system is explicitly designed to minimize token spend:

- **Haiku** handles grep sweeps, build verification, log monitoring, docs updates — anything mechanical and well-specified.
- **Sonnet** handles domain-specific implementation where the agent needs real expertise.
- **Opus** handles judgment calls, architecture decisions, and cross-cutting refactors where getting it wrong is expensive.

In practice, this produces roughly 40-50% token savings compared to routing everything through the most capable model.

### Corporate Org Chart

An interactive HTML visualization (`org-chart.html`) renders the full workforce hierarchy — tiers, roles, domain ownership, and reporting lines. Useful for onboarding and for auditing agent coverage gaps.

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-org/ai-corporate.git
```

### 2. Copy the framework into your project

```bash
cp -r ai-corporate/.claude/ your-project/.claude/
cp -r ai-corporate/.githooks/ your-project/.githooks/
```

### 3. Configure git hooks

```bash
cd your-project
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
```

### 4. Customize agent definitions

Edit the files in `.claude/agents/` to match your project's domains. Each agent definition is a Markdown file specifying:

- Name, role, and model tier
- Tools the agent is allowed to use
- Domain boundaries (what files/systems it owns)
- Constraints and safety gates

### 5. Update the routing table

Edit `CLAUDE.md` to map your project's file structure and domains to the appropriate specialists. The routing table is the core of the system — it determines which agent handles which trigger.

### 6. Configure pre-commit gates

Edit `.githooks/pre-commit` to enable or disable gates based on your project's needs. Not every project needs all 8 gates — start with docs pairing and typecheck, then add more as your agent workforce matures.

---

## How the System Works

AI Corporate operates on a **three-tier cost model** where every task is routed to the cheapest model that can handle it:

| Tier | Model | Output Cost | Role |
|------|-------|------------|------|
| **Opus** ($75/MTok output) | Senior leadership | 60x Haiku | Judgment, architecture, approvals |
| **Sonnet** ($15/MTok output) | Specialists | 12x Haiku | Domain expertise, implementation |
| **Haiku** ($1.25/MTok output) | Workers | Baseline | Verification, grep, docs, mechanical tasks |

This produces **40-50% token savings** compared to routing everything through the most capable model. The savings come from high-volume mechanical tasks (verification, docs, grep) running on Haiku at 1/60th the cost of Opus.

For the full operational methodology, see **[How It Works](docs/how-it-works.md)** -- covering parallel execution, the orchestrator pattern, agent lifecycle, and the pre-commit gate pipeline.

For detailed pricing, decision matrices, and anti-patterns, see **[Cost Model](docs/cost-model.md)**.

### Session Example: Parallel Execution Flow

When a user requests a new feature, the system executes in parallel rather than sequentially:

```
User: "Add an inventory report with API endpoint"

1. Orchestrator reads routing table, spawns Planner (opus)
2. Planner returns sub-tasks:
   - DB query (postgres specialist)
   - Report component (frontend specialist)
   - Edge function (edge-fn specialist)
   - Tests (QA engineer)
   - Docs (docs scribe)

3. Orchestrator spawns in parallel (all background):
   +-- Postgres specialist (sonnet) --> writes query
   +-- QA engineer (sonnet)         --> writes tests
   +-- Docs scribe (haiku)          --> prepares doc updates
   |
   (orchestrator stays free for other work)
   |
4. Sequential follow-ups (depend on DB output):
   +-- Frontend specialist (sonnet) --> builds component
   +-- Edge-fn specialist (sonnet)  --> implements endpoint

5. Orchestrator verifies: build + typecheck + tests + deno check
6. Commits code + docs together (pre-commit gates enforce pairing)
7. Deploys after user approval (safety gate)
8. Skill-updater audits agent knowledge (same commit)
```

The orchestrator never does specialist work inline. It coordinates, verifies, and holds all approval gates. Specialists report back; the orchestrator decides.

---

## Directory Structure

```
.claude/
  agents/                          # Employee definitions (one .md per agent)
    postgres-pro.md
    typescript-pro.md
    senior-engineer.md
    verifier.md
    ...
  hooks/
    route-guard.mjs                # Specialist routing enforcement
    clear-domain-locks.mjs         # Manual lock clearing utility
  memory/                          # Persistent memory across sessions
  org-chart.html                   # Interactive workforce visualization
  settings.json                    # Hook registration + permissions

.githooks/
  pre-commit                       # 8-gate enforcement hook

CLAUDE.md                          # Master rules file
                                   #   - Routing table (trigger -> agent)
                                   #   - Pre-commit gate definitions
                                   #   - Safety policies
                                   #   - Cost-tier guidelines
```

---

## Battle-Tested Stats

This framework was extracted from a production deployment where it managed:

- **47 employees** across 3 model tiers
- **8 pre-commit gates** enforced on every commit
- **3 governance hooks** (route-guard, db-write-guard, read-skill-reminder)
- **247 enforced tests** gated by pre-commit
- **~40-50% token savings** vs. an all-opus approach
- **13 deliverables** completed in the first full governance session

---

## Design Principles

**Agents are employees, not tools.** They have names, roles, boundaries, and accountability. This is not metaphorical — the naming and role structure changes how the orchestrator reasons about delegation.

**Enforce, don't advise.** Every rule that matters is hook-enforced. Advisory guidelines get ignored under token pressure. If a rule is worth having, it is worth blocking commits over.

**Cheapest capable tier.** Every task should run on the cheapest model that can handle it. Opus is for judgment, not for grep.

**Documentation is not optional.** Code changes without matching docs updates are rejected at pre-commit. Agents cannot skip this step.

**Specialists own domains.** A generalist agent that "knows a little about everything" produces worse results than a specialist that knows its domain deeply. The routing table makes this structural, not aspirational.

---

## Adapting to Your Project

AI Corporate is domain-agnostic. The framework provides the governance structure; you provide the domain knowledge. To adapt it:

1. **Define your domains.** What are the major areas of your codebase? Database, frontend, API, infrastructure, testing?

2. **Staff accordingly.** Create one specialist agent per domain. Start small — 5-10 agents is plenty for most projects. You can always recruit more through the HR process.

3. **Set your routing table.** Map file patterns and task triggers to specialists. Be specific: `*.sql` files go to the database specialist, `*.test.*` files go to the QA agent.

4. **Choose your gates.** Enable the pre-commit gates that match your workflow. Docs pairing and typecheck are good defaults.

5. **Tune cost tiers.** Assign haiku to anything mechanical (verification, formatting, grep). Promote to sonnet only when domain expertise is needed. Reserve opus for decisions that are expensive to reverse.

---

## Contributing

Contributions are welcome. If you have governance patterns that worked well in your multi-agent setup, open a PR.

Areas of particular interest:

- Additional pre-commit gates
- Alternative escalation strategies
- Cross-agent communication patterns
- Metrics and observability for agent performance

---

## License

MIT

---

## Credits

Built by [Karthik Nataraj](https://github.com/karthiknl0) for your project ERP, extracted as a reusable framework for governing AI coding agent workforces.
