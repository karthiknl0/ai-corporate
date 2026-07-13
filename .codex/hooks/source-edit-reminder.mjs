#!/usr/bin/env node
// Codex PreToolUse hook. Codex does not expose a reliable parent-versus-
// subagent identity in this event, so a hard block would also block the
// specialist it asks for. Provide routing context instead of fake enforcement.
import { readFileSync } from "node:fs";

let payload = {};
try { payload = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { process.exit(0); }

const command = String(payload?.tool_input?.command ?? "");
const sourcePath = /(?:src|app|lib|server)[\\/][^\s"']+\.(?:[cm]?[jt]sx?|py|go|rs|java|rb|php)/i.test(command);

if (sourcePath) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: "This patch changes source code. Confirm the task was routed in AGENTS.md; use a named specialist for non-trivial or cross-cutting work."
    }
  }));
}
