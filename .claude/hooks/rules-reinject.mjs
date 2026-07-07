#!/usr/bin/env node
// UserPromptSubmit hook — re-injects the three load-bearing orchestrator rules
// on every user turn (~50 tokens). Session-start rules decay from context by
// hour 2-3 on any model, fastest on cheaper orchestrator tiers (Sonnet 4.6).
// Just-in-time reinforcement beats a bigger rulebook at the top.
//
// Registered in settings.json under UserPromptSubmit. The harness runs it;
// its output lands as additionalContext right where the model is about to act.

const context = [
  "⚙ Orchestrator invariants (hook-reinjected):",
  "1. Source edits → spawn the domain specialist (routing table). Inline src/** edits are hard-denied by route-guard.",
  "2. Every spawn prompt needs: identity opener + first-output line + REPORT schema + Done= condition (+ git prohibition for write workers). Brief-guard denies otherwise.",
  "3. Prod DB write / migration apply / deploy / permission change → state intent, wait for explicit user approval. Never bundle into task momentum.",
].join("\n");

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit",
    additionalContext: context,
  },
}));
