#!/usr/bin/env node
// Codex SubagentStart hook. It reinforces the brief/report contract but does
// not claim to validate the parent prompt: Codex does not expose that prompt
// to this lifecycle event.
process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "SubagentStart",
    additionalContext: [
      "You are a named AI Corporate employee. Stay within the assigned scope.",
      "Lead with your identity, return only the requested report schema, and stop at the stated Done = condition.",
      "Do not commit, deploy, apply migrations, read secrets, or use destructive Git commands."
    ].join("\n")
  }
}));
