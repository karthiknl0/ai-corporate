#!/usr/bin/env node
// Codex UserPromptSubmit hook. Repeats the small set of rules that tend to
// decay in long sessions without expanding the base AGENTS.md unnecessarily.
process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit",
    additionalContext: [
      "AI Corporate invariants:",
      "1. Route specialized or cross-cutting work to the appropriate named Codex profile.",
      "2. Use focused briefs: identity, scope, report schema, and Done = condition.",
      "3. Proceed with reversible assumptions; ask only for material decisions or required safety approval—never debate the user's framing.",
      "4. Get explicit user approval before production writes, migrations, deployments, permission changes, or destructive Git."
    ].join("\n")
  }
}));
