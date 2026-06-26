# Migrating an Existing Project to AI Corporate

This guide covers three adoption scenarios depending on your starting point, plus an incremental rollout plan and common issues.

---

## Scenario 1: Fresh Claude Code Project (No Agents Yet)

You have a repo but haven't used Claude Code agents or governance before.

### Steps

1. **Copy the framework directories into your repo:**

```bash
cp -r ai-corporate/.claude/ your-project/.claude/
cp -r ai-corporate/.githooks/ your-project/.githooks/
```

2. **Activate the git hooks:**

```bash
cd your-project
git config core.hooksPath .githooks
```

3. **Create your CLAUDE.md** (or adopt the template):

```bash
cp ai-corporate/CLAUDE.md your-project/CLAUDE.md
```

Edit the routing table to reference your actual files and directories. Replace domain-specific triggers with ones that match your project structure. For example, if your project has no database layer, remove the `postgres-pro` routes and add routes for whatever your project does have.

4. **Start with 5 core agents:**

These five cover the most common needs without overwhelming you:

| Agent | Why it's core |
|-------|--------------|
| `senior-hr` | Routes tasks to the cheapest capable agent -- saves tokens from day one |
| `senior-planner` | Breaks multi-step tasks into ordered phases before anyone writes code |
| `verifier` | Runs build/typecheck/lint after every change -- catches regressions early |
| `debugger` | Handles hard bugs that span multiple systems |
| `code-reviewer` | Structured review against your project's patterns |

Remove all other agent definitions from `.claude/agents/` for now. You can always add them back.

5. **Add domain specialists as patterns emerge:**

After a week or two, review your session transcripts. If you keep doing the same kind of specialist work inline (database queries, security checks, test writing), that's a signal to recruit a specialist. See [recruit-your-agents.md](recruit-your-agents.md) for the evaluation framework.

---

## Scenario 2: Existing Claude Code Project with CLAUDE.md but No Agents

You already have a CLAUDE.md with project rules. You want to add the agent governance layer without losing your existing configuration.

### Steps

1. **Keep your existing CLAUDE.md rules.** Don't replace your file -- merge into it.

Add these sections from the template CLAUDE.md to yours:

- **Skill routing table** -- maps triggers to agent names
- **Safety gates** -- approval requirements for destructive operations
- **Escalation policy** -- when to bump from haiku to sonnet to opus

```bash
# Compare what you have vs what the template provides
diff your-project/CLAUDE.md ai-corporate/CLAUDE.md
```

2. **Copy the agent definitions and hooks:**

```bash
cp -r ai-corporate/.claude/agents/ your-project/.claude/agents/
cp -r ai-corporate/.claude/hooks/ your-project/.claude/hooks/
```

3. **Add the route-guard hook to your settings:**

Edit `.claude/settings.json` and add the route-guard hook entry. This hook checks whether the right specialist agent is being used for each task:

```json
{
  "hooks": {
    "pre-tool-use": [
      {
        "command": ".claude/hooks/route-guard.sh",
        "description": "Validates specialist routing before tool execution"
      }
    ]
  }
}
```

If you already have hooks in `settings.json`, add the route-guard entry alongside them -- don't replace existing hooks.

4. **Register pre-commit gates incrementally:**

Don't turn on all gates at once. Start with two:

- **Gate 1: Code needs docs** -- every code commit must include a corresponding doc update
- **Gate 5: Typecheck passes** -- staged TypeScript must pass `tsc`

```bash
# In .githooks/pre-commit, enable only Gate 1 and Gate 5
# Comment out Gates 2, 3, 3b, 4, 6 until you're ready
```

Add the remaining gates over subsequent weeks as your team adapts.

---

## Scenario 3: Existing Project with Some Agents Already

You have agent definitions but no governance framework around them.

### Steps

1. **Audit existing agents against the tier model:**

List your current agents and check which model each one uses:

```bash
grep -r "model:" .claude/agents/*.md | sort
```

Look for mismatches:
- Is an opus-tier agent doing mechanical work (formatting, linting, grepping)? Demote it to haiku.
- Is a haiku agent making architectural decisions? Promote it to opus or route those tasks to a senior agent.
- Are two agents covering overlapping domains? Merge them or define clear boundaries.

The tier model:
| Tier | Model | Use for |
|------|-------|---------|
| Worker | haiku | Mechanical, well-specified tasks (verify, lint, grep, write docs from spec) |
| Specialist | sonnet | Domain expertise, judgment within a bounded area |
| Senior | opus | Cross-cutting decisions, architecture, approval authority |

2. **Add governance hooks:**

```bash
cp ai-corporate/.claude/hooks/route-guard.sh your-project/.claude/hooks/
cp ai-corporate/.claude/hooks/domain-exclusion.sh your-project/.claude/hooks/
```

The route-guard hook ensures specialist agents handle specialist work. The domain-exclusion hook prevents agents from editing files outside their designated area.

3. **Apply the naming convention to existing agents:**

Rename agent files to follow the pattern: `role-name.md` (e.g., `database-specialist.md`, not `db.md` or `my-sql-helper.md`).

Inside each agent definition, add the standard header:

```markdown
# Agent Name (role) (model)

## Domain
What this agent owns.

## Tools
What tools it can use.

## Boundaries
What it must NOT do.
```

4. **Register agents in the CLAUDE.md routing table:**

Add a trigger-to-agent mapping for each agent:

```markdown
## Skill routing
| Trigger | Agent |
|---------|-------|
| Database query or schema change | `database-specialist` |
| React performance issue | `react-specialist` |
| Security audit | `security-auditor` |
```

5. **Validate each agent with the recruitment evaluation:**

For every existing agent, run the justification check from [recruit-your-agents.md](recruit-your-agents.md):

- Does this agent handle work that comes up at least weekly?
- Is there a measurable quality or cost difference vs. doing it inline?
- Can you define clear domain boundaries (what it owns, what it doesn't)?

If an agent fails this check, remove it. Fewer well-defined agents beat many vague ones.

---

## Incremental Adoption (Recommended)

Adopting everything at once creates friction. This four-week rollout lets your team adjust gradually.

### Week 1: Foundation

- Add CLAUDE.md with routing table and safety gates
- Deploy 5 core agents: `senior-hr`, `senior-planner`, `verifier`, `debugger`, `code-reviewer`
- Enable Gate 1 only (code commits need docs)
- Goal: team gets used to agent routing and the "docs with code" discipline

### Week 2: Specialist Routing

- Add the route-guard hook to `.claude/settings.json`
- Recruit 2-3 domain specialists based on your most common inline work (check session transcripts)
- Add domain-exclusion hook for those specialists
- Goal: specialist work stops happening inline; token costs drop

### Week 3: Quality Gates

- Enable remaining pre-commit gates (typecheck, tests, agent knowledge maps)
- Add the `code-mapper` worker for large files
- Add the `skill-updater` worker so agent knowledge stays current
- Goal: nothing broken ships; agent knowledge doesn't drift

### Week 4: Governance

- Add escalation policy (when haiku bumps to sonnet, when sonnet bumps to opus)
- Enable domain-exclusion enforcement (agents can't edit outside their area)
- Run the recruitment evaluation on all agents -- prune any that aren't justified
- Goal: full governance in place; costs optimized

---

## Common Migration Issues

### Hook conflicts with existing pre-commit hooks

If you already have pre-commit hooks (husky, lint-staged, etc.), don't replace them.

```bash
# Option A: Chain hooks in .githooks/pre-commit
#!/bin/bash
# Run existing hooks first
./node_modules/.bin/lint-staged
# Then run AI Corporate gates
./.claude/hooks/pre-commit-gates.sh

# Option B: Keep your existing hook tool, add AI Corporate gates as an extra step
# In package.json (if using husky/lint-staged):
{
  "lint-staged": {
    "*.ts": ["eslint --fix", ".claude/hooks/typecheck-gate.sh"]
  }
}
```

### Agent definitions too verbose

Keep each agent definition under 100 lines. If an agent's `.md` file is growing past that:

- Move domain knowledge into a separate skill file that the agent loads on demand
- Keep the agent definition focused on: role, model, tools, boundaries, escalation rules
- Reference skill files with "Load `skills/your-skill.md` before starting"

### Route-guard false positives

The route-guard hook uses regex patterns to match file paths to domains. If it's flagging work that shouldn't require a specialist:

```bash
# Check which pattern is triggering
.claude/hooks/route-guard.sh --dry-run

# Tune the DOMAINS mapping in the hook
# Before (too broad):
DOMAINS["database"]="*.sql|**/db/**|**/data/**"
# After (more precise):
DOMAINS["database"]="supabase/migrations/*.sql|src/db/**"
```

### Existing team members confused by agent names

Share the org chart early. Create a one-page summary:

```markdown
## Our AI Team

**Senior leadership** (opus) -- make decisions, approve changes
- senior-hr: routes tasks to the right agent
- senior-planner: breaks big tasks into steps

**Specialists** (sonnet) -- deep domain expertise
- database-specialist: schema, queries, migrations
- react-specialist: components, performance, state

**Workers** (haiku) -- fast mechanical tasks
- verifier: runs build + tests after every change
- docs-scribe: updates documentation from specs
```

Pin this in your team channel. Update it when you add or remove agents.

---

## Quick Reference: What Goes Where

| File/Directory | Purpose |
|----------------|---------|
| `CLAUDE.md` | Routing table, safety gates, escalation policy |
| `.claude/agents/` | Agent definitions (one `.md` per agent) |
| `.claude/hooks/` | Governance hooks (route-guard, domain-exclusion) |
| `.claude/settings.json` | Hook registration, permissions |
| `.githooks/` | Git hooks (pre-commit gates) |
| `docs/` | Agent skill files, knowledge maps |
