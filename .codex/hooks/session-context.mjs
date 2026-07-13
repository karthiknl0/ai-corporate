#!/usr/bin/env node
// Codex SessionStart hook. Plain text is added to developer context.
process.stdout.write([
  "AI Corporate is active for this repository.",
  "Read AGENTS.md before edits. Route cross-cutting work to the named Codex profiles.",
  "Production writes, migrations, deployments, permission changes, and destructive Git need explicit user approval."
].join("\n"));
