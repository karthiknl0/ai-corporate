#!/usr/bin/env node
// PreToolUse guard for Agent tool calls — enforces mandatory corporate identity rules.
//
// Every agent spawn MUST have both of these in the prompt:
//   1. OPENER  — "You are **[Name]** ([role], [model]) — ..." opening identity line
//   2. OUTPUT  — instruction telling the agent to emit their identity as their FIRST output line
//               so it appears in the Claude Code Background Tasks panel.
//
// If either is missing → "ask" block naming exactly what to add.
// This hook is run by the HARNESS, not Claude — it cannot be reasoned past.
//
// v2 (2026-07-07): BRIEF QUALITY GATE — identity alone passed garbage briefs.
// Every spawn prompt must now ALSO contain:
//   3. REPORT SCHEMA — a "REPORT"/"Report back" block so output is schema-fixed
//   4. DONE CONDITION — "Done =" / "stop when" so the agent knows when to stop
//   5. GIT PROHIBITION — write-capable workers must be forbidden destructive git
// Decision is now "deny" (was "ask"): deny bounces the exact missing pieces
// back to the model, which fixes the prompt and re-spawns — no user interrupt.

import { readFileSync } from "node:fs";

// Matches: "You are **Name**" (capital letter start)
const IDENTITY_OPENER = /You are \*\*[A-Z][a-zA-Z]+\*\*/;

// Matches the output instruction we require — any of these forms:
//   "Your very first text output"
//   "Output your identity as the very first line"
//   "first line: **I am"
//   "must be: **I am"
const IDENTITY_OUTPUT = /your very first (text )?output|output your identity as the very first|first (output )?line.*I am \*\*|must be.*I am \*\*/i;

function emit(decision, reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: decision,
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

let data = {};
try { data = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { process.exit(0); }

const prompt = String(data?.tool_input?.prompt ?? "");
if (!prompt) process.exit(0);   // no prompt field — not an Agent tool call we care about

// v2 brief-quality checks
const REPORT_SCHEMA = /\bREPORT\b|\breport schema\b|Report back/i;
const DONE_CONDITION = /\bDone\s*=|done.?condition|stop when|stop condition|VERDICT:/i;
const GIT_PROHIBITION = /git (checkout|reset|restore)[^.\n]{0,40}(forbidden|never|prohibited|not allowed)|(forbidden|never|prohibited|do not use)[^.\n]{0,40}git (checkout|reset|restore)|never (run|use) destructive git/i;
// Write-capable agents whose briefs must forbid destructive git
const WRITE_AGENTS = new Set([
  "docs-scribe","skill-updater","code-mapper","comms-manager",
  "sales-purchase-specialist","inventory-specialist","tax-specialist",
  "accounting-specialist","reports-print-specialist","storefront-portal-specialist",
  "react-specialist","typescript-pro","postgres-writer","qa-engineer",
  "devops-engineer","debugger","security-boundary-auditor","migration-file-writer",
]);
const subtype = String(data?.tool_input?.subagent_type ?? "").toLowerCase();

const hasOpener  = IDENTITY_OPENER.test(prompt);
const hasOutput  = IDENTITY_OUTPUT.test(prompt);
const hasReport  = REPORT_SCHEMA.test(prompt);
const hasDone    = DONE_CONDITION.test(prompt);
const needsGit   = WRITE_AGENTS.has(subtype);
const hasGit     = !needsGit || GIT_PROHIBITION.test(prompt);

if (hasOpener && hasOutput && hasReport && hasDone && hasGit) process.exit(0);

const missing = [];
if (!hasReport) missing.push(
  `❌  REPORT SCHEMA missing — add a fixed report block so output is schema-bound:\n` +
  `    "REPORT (nothing outside this schema):\n` +
  `     VERDICT: <fixed | blocked | needs-decision> — one line\n` +
  `     CHANGES: file per line · EVIDENCE: <=10 lines · OPEN: only if non-empty"`
);
if (!hasDone) missing.push(
  `❌  DONE CONDITION missing — state when the agent stops, e.g.:\n` +
  `    "Done = failing case passes + typecheck green." Without it the agent under- or over-verifies.`
);
if (needsGit && !hasGit) missing.push(
  `❌  GIT PROHIBITION missing — "${subtype}" is write-capable. Add to the prompt:\n` +
  `    "git checkout/reset/restore forbidden." (a worker once reverted uncommitted parent edits)`
);
if (!hasOpener) missing.push(
  `❌  OPENER missing — add as the FIRST line of the prompt:\n` +
  `    "You are **Name** (role, model) — one-line task summary."\n` +
  `    Example: "You are **Varun** (sales-purchase-specialist, sonnet) — fix the totals bug."`
);
if (!hasOutput) missing.push(
  `❌  OUTPUT INSTRUCTION missing — add this anywhere in the prompt:\n` +
  `    "Your very first text output — before any tool calls — must be a single line:\n` +
  `    I am **Name** (role, model) — [task summary]."\n` +
  `    This makes the agent identity appear in the Claude Code Background Tasks panel.`
);

emit(
  "deny",
  `⛔  BRIEF GUARD v2 — Agent spawn blocked. The prompt is missing required element(s):\n\n` +
  missing.join("\n\n") +
  `\n\nFix the prompt and re-spawn (schemas → docs/orchestrator-turn-loop.md mini-briefs).`
);
