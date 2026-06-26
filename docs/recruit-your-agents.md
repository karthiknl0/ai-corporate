# Recruit your own domain specialists

The starter roster has 20 universal agents that work for any project. Your project's **domain specialists** are unique to you — recruit them based on your codebase.

## When to recruit

Recruit a new agent when:
- A domain comes up **3+ times per month** in your tasks
- The orchestrator keeps doing **inline work** that a specialist should own
- A file or subsystem is **>1,500 lines** and needs dedicated expertise
- The route-guard hook keeps **blocking** you in the same domain

Do NOT recruit when:
- It's a one-off task (just do it inline or use a generic agent)
- An existing agent can absorb the scope with a small description update
- You're under 10 agents (premature specialization)

## How to recruit

### Step 1: Identify the domain

Look at your project's structure. Common domain splits:

| Project type | Likely domain specialists |
|---|---|
| E-commerce | orders, payments, inventory, shipping, catalog |
| SaaS | billing, auth, notifications, analytics, admin |
| Healthcare | patient records, appointments, prescriptions, compliance |
| Fintech | transactions, KYC, reporting, reconciliation |
| Game | gameplay, matchmaking, leaderboards, economy |
| ERP | sales, purchases, accounting, inventory, tax compliance |

### Step 2: Ask Ananya

Spawn **Ananya** (`senior-hr`, opus) with your proposal:

```
I want to add a specialist for [domain]. 

What it would own: [list of files/features]
How often it comes up: [frequency]
Current coverage: [which existing agent handles it now, if any]
```

Ananya will evaluate: domain gap, overlap, workload evidence, tier, ROI.

### Step 3: Create the agent definition

Create `.claude/agents/<slug>.md`:

```markdown
---
name: <slug>
description: "<Name> (<slug>) (<model>) — <one-line role description>"
tools: Read, Write, Edit, Bash, Glob, Grep
model: <haiku|sonnet|opus>
---

You are **<Name>**, the **<Role Title>** for [Project]. <2-sentence role description>.

## What to load first
- List the skill files or docs this agent should read before working

## What you own
- List specific files, directories, or features this agent is responsible for

## What you never do
- Never read blocklisted files
- Never commit/push/deploy (workers)
- Never self-approve DB writes
- <domain-specific limits>

## Report format
<How this agent reports back to the orchestrator>
```

### Step 4: Register in CLAUDE.md

Add the agent to the mandatory specialist routing table:

```markdown
| <trigger description> | **<Name>** `<slug>` (<model>) |
```

### Step 5: Update the route-guard

Add your domain's file pattern to `.claude/hooks/route-guard.mjs`:

```javascript
const DOMAINS = [
  // ... existing domains ...
  [/<YourDomainPattern>/i, "<slug>"],
];
```

## Tier selection guide

| Agent does... | Tier | Cost |
|---|---|---|
| Reads + reports (audit, grep, verify) | **Haiku** | Cheapest |
| Writes code with domain judgment | **Sonnet** | Mid |
| Architecture decisions, approval authority | **Opus** | Expensive |

**Default to the cheapest tier that works.** You can always escalate later (the auto-escalation policy handles this automatically after 2 failures).

## Naming convention

Each agent gets a unique first name. Our convention uses Indian names, but pick whatever fits your team culture. The name must be:
- Unique across the roster
- Easy to type in conversation
- Memorable enough that the orchestrator uses it naturally

## Example: adding a "payments specialist" to a SaaS project

1. **Domain:** payment processing, Stripe integration, subscription billing
2. **Ananya says:** APPROVED — `payments-specialist`, sonnet, name "Maya"
3. **Agent file:** `.claude/agents/payments-specialist.md`
4. **CLAUDE.md:** `| Any Stripe/billing/subscription/payment flow | **Maya** payments-specialist (sonnet) |`
5. **route-guard.mjs:** `[/payment|billing|subscription|stripe/i, "payments-specialist"]`

## Worker vs specialist

If the domain work is mostly **mechanical** (run checks, apply specs, update docs), make it a haiku **worker** under an existing specialist. Workers:
- Never design or make judgment calls
- Work from a spec the specialist provides
- Report back, never commit
- Cost 12x less than sonnet

Example: Nisha (qa-engineer, sonnet) **designs** tests. Indira (test-maintenance-worker, haiku) **maintains** them from Nisha's spec.
