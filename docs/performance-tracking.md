# Performance Tracking

Track agent quality over time — not just routing correctness, but output quality and instruction compliance.

---

## The Performance Log

Maintain a JSON file at `.claude/memory/agent-performance-log.json`. Each entry records one agent task:

```json
[
  {
    "session": "2026-06-27-1",
    "agent": "Nisha (qa-engineer, sonnet)",
    "task": "Write payment flow tests",
    "result": "success",
    "notes": "12 tests, all passing, good edge case coverage"
  },
  {
    "session": "2026-06-27-1",
    "agent": "Rohan (reports-specialist, sonnet)",
    "task": "Centralize font sizes in shared constants file",
    "result": "violation",
    "notes": "Given explicit instructions to add constants to shared file then import everywhere. Instead hardcoded values in each file. Orchestrator had to redo 9 files."
  }
]
```

### Result Types

| Result | Meaning |
|--------|---------|
| `success` | Task completed correctly |
| `failure` | Task failed (triggers auto-escalation count) |
| `violation` | Agent ignored instructions or broke a governance rule |
| `escalated` | Task was escalated to a higher tier |

### What to Log

Log every subagent task — not just failures. Success entries are valuable:
- They confirm which agents handle which domains well
- They provide positive data for HR routing decisions
- They create a track record for capability audits

### When to Log

The orchestrator logs the entry when a subagent's work is complete and reviewed. Do not log mid-task — wait until you can assess the final output.

---

## Violation Categories

### Routing violations
The agent edited files outside its declared domain scope. Tracked separately in `route-violations.json` by the route-guard hook.

### Instruction violations
The agent received explicit instructions (via the spawn prompt or via SendMessage) and did not follow them. This is the most common violation type — the agent takes a shortcut or ignores an architectural direction.

### Quality violations
The agent produced output that required significant rework. The code compiled but did not meet the stated requirements.

### Gate violations
The agent attempted to bypass a safety gate (DB write without approval, commit without docs, etc.). These are blocked by hooks and rarely succeed, but the attempt is logged.

---

## Using the Log

### HR routing decisions
When Ananya (senior-hr) evaluates a task routing, she can check the performance log to see which agents have a track record on similar tasks.

### Capability audits
Periodic reviews of the log reveal:
- Agents that consistently succeed (confirm tier assignment)
- Agents that frequently fail (consider retraining or tier upgrade)
- Agents that violate instructions (tighten their definition or add hook enforcement)

### Auto-escalation context
When escalating to a higher tier, include the performance log entries so the senior agent knows what was tried and why it failed.

---

## Mid-Task Communication

When a background agent is already running and you need to change its approach, use `SendMessage` to deliver updated instructions:

```
SendMessage({
  to: "<agent-id>",
  summary: "Use centralized constants approach",
  message: "Instead of hardcoding values in each file, add constants to the shared tokens file first, then import them everywhere..."
})
```

**Important:** The agent may already be deep in its original approach when the message arrives. If the agent ignores the updated instructions, log it as an instruction violation. This is a known failure mode — agents under token pressure tend to continue their current approach rather than pivot.

### Prevention

For critical architectural decisions, prefer:
1. **Pre-briefing in the spawn prompt** over mid-task correction
2. **Killing and re-spawning** over hoping a SendMessage lands in time
3. **Foreground execution** when the approach must be exact (use background only for well-specified mechanical tasks)

---

## Starter Log

Create the initial file:

```bash
echo '[]' > .claude/memory/agent-performance-log.json
```

The orchestrator appends entries after each subagent task completes.
