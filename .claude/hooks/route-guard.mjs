#!/usr/bin/env node
// PreToolUse guard for Edit / Write / Bash tool calls — enforces the mandatory
// specialist-routing rule (CLAUDE.md "Agent accountability"). The orchestrator
// is the one who decides whether to spawn a specialist or edit inline, so a
// prose rule alone is self-policed ("fox guarding the henhouse"). This hook is
// run by the HARNESS, not by Claude, so it cannot be reasoned past in the moment.
//
// v2 (2026-06-29): STRICT MODE — blocks ALL src/** edits by the orchestrator,
// not just known specialist domains. The orchestrator must delegate code edits.
// Only docs (.md), config (.json), and migration files pass without a specialist.
//
// v3 (2026-07-06): BASH WRITE GUARD — Bash/PowerShell commands that write to
// specialist-domain source paths (sed -i, heredoc, tee, git apply, cat >) are
// now also intercepted. Previously these bypassed the Edit/Write hook entirely.
//
// v4 (2026-07-07): HARD DENY — orchestrator source edits and Bash write
// bypasses are now "deny" (was "ask"). An "ask" gets habitually approved and
// teaches the orchestrator nothing; a "deny" bounces the correction back to
// the model, which then spawns the specialist. Genuine inline needs: the USER
// (outside the session) creates .claude/ROUTE_OVERRIDE with one path per line;
// the hook consumes a matching line as a one-shot pass. The orchestrator
// cannot create that file — writes to it are denied unconditionally.
//
// Behaviour:
//   - Edit/Write to ANY src/** path by orchestrator -> "ask" (must spawn specialist)
//   - Edit/Write to supabase/functions/** by orchestrator -> "ask" (edge-fn-specialist)
//   - Edit/Write to migrations/** by orchestrator -> passes (file creation OK, apply needs Deepak)
//   - Edit/Write to .agents/skills/** or docs/** by orchestrator -> passes (docs OK)
//   - Edit/Write by a subagent OUT of its declared scope -> "deny"
//   - Bash/PowerShell command writing to src/** or supabase/functions/** -> "ask"
//   - Domain exclusion lock still enforced for parallel safety

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const LOG = ".claude/memory/route-violations.json";
const LOCKS = ".claude/memory/domain-locks.json";
const LOCK_TTL_MS = 10 * 60 * 1000; // 10 min

// SPECIFIC domain routing — names the exact specialist to spawn.
// First match wins. Used for the "ask" message to tell orchestrator WHO to spawn.
const DOMAINS = [
  [/supabase[\/]functions[\/]/i, "edge-fn-specialist", "edge-fn-specialist"],
  [/[\/]migrations[\/].*\.sql$/i, "postgres-writer (apply needs approval)", "migrations"],
  [/Sale(Create|Edit|View|Convert)/i, "sales-purchase-specialist", "sales-purchase-specialist"],
  [/Purchase(s|Create|View|Convert)/i, "sales-purchase-specialist", "sales-purchase-specialist"],
  [/Inventory/i, "inventory-specialist", "inventory-specialist"],
  [/(Tax|TaxReturns|eInvoice)/i, "tax-specialist", "tax-specialist"],
  [/(LedgerEntry|bank-reconciliation|LedgerStatement)/i, "accounting-specialist", "accounting-specialist"],
  [/(Reports|useReports)/i, "reports-print-specialist", "reports-print-specialist"],
  [/(storefront|shop|portal)/i, "storefront-portal-specialist", "storefront-portal-specialist"],
  [/Payroll/i, "payroll domain — accounting specialist", "payroll"],
];

// STRICT CATCH-ALL: ANY src/** or supabase/functions/** file that didn't match
// a specific domain above. The orchestrator has NO business editing source code.
const SRC_CATCHALL = /(^|[\\/])src[\\/].*\.(ts|tsx|css)$/i;
const EDGE_CATCHALL = /supabase[\\/]functions[\\/].*\.(ts|js)$/i;

// v5 (2026-07-07): DOC-WORKER ROUTING — the blanket .md allowance is closed.
// "One-line doc edit is cheaper inline" gets generalized into multi-table doc
// rewrites. Docs and skills route to their dedicated workers like any domain.
const DOC_ROUTES = [
  [/\.agents[\\/]skills[\\/].*\.md$/i, "skill-updater"],
  [/(^|[\\/])docs[\\/].*\.md$/i, "docs-scribe"],
];

// Paths the orchestrator IS allowed to edit directly (no specialist needed)
const ORCHESTRATOR_ALLOWED = [
  /(^|[\\/])memory[\\/].*\.md$/i,                    // session memory files
  /\.claude[\\/]memory[\\/]/i,                       // runtime memory files
  /(^|[\\/])(CLAUDE|CODEX|AGENTS|README)\.md$/i,     // root instruction files
  /\.(json)$/i,                                      // config files
  /[\\/]migrations[\\/].*\.sql$/i,                   // migration file creation (not apply)
  /\.gitignore$/i,
  /\.githooks[\\/]/i,
  /\.claude[\\/]hooks[\\/]/i,                        // governance hooks
  /\.claude[\\/]agents[\\/]/i,                       // agent definitions
];

// subagent identity -> RegExp of paths it is ALLOWED to write. Anything else = deny.
const SCOPE = {
  "docs-scribe": /\.(md)$/i,
  "skill-updater": /\.agents[\/]skills[\/].*\.md$/i,
  "migration-file-writer": /[\/]migrations[\/].*\.sql$/i,
  "code-mapper": /\.(md)$/i,
  "comms-manager": /\.(md|txt)$/i,
};

// --- domain lock helpers ---
function readLocks() {
  try { if (existsSync(LOCKS)) return JSON.parse(readFileSync(LOCKS, "utf8")) || {}; } catch {}
  return {};
}
function writeLocks(locks) {
  try { writeFileSync(LOCKS, JSON.stringify(locks, null, 2)); } catch {}
}
function lockActive(lock) {
  if (!lock || !lock.at) return false;
  const age = Date.now() - Date.parse(lock.at);
  return Number.isFinite(age) && age >= 0 && age < LOCK_TTL_MS;
}
function fmtSince(at) {
  try { return new Date(at).toISOString().slice(11, 16); } catch { return at; }
}

const OVERRIDE = ".claude/ROUTE_OVERRIDE";
// One-shot user-created override: one path per line, consumed on use.
function consumeOverride(p) {
  try {
    if (!existsSync(OVERRIDE)) return false;
    const lines = readFileSync(OVERRIDE, "utf8").split(/\r?\n/).filter(Boolean);
    const norm = p.replace(/\\/g, "/");
    const idx = lines.findIndex(l => norm.endsWith(l.trim().replace(/\\/g, "/")));
    if (idx === -1) return false;
    lines.splice(idx, 1);
    writeFileSync(OVERRIDE, lines.join("\n"));
    return true;
  } catch { return false; }
}

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

// --- BASH / POWERSHELL WRITE GUARD (v3) ---
// Catches shell commands that write to specialist-domain source paths,
// bypassing the Edit/Write hook entirely (e.g. sed -i, heredoc, tee, git apply).
const toolName = String(data?.tool_name ?? "").toLowerCase();
if (toolName === "bash" || toolName === "powershell") {
  const cmd = String(data?.tool_input?.command ?? "");
  // Patterns that write file content: redirect (>/>>/|&>), tee, sed -i/--in-place,
  // patch, git apply, cat/echo to file, printf to file, Out-File (PowerShell)
  const BASH_WRITE_RE = /(?:>>?|tee\s+(?:-a\s+)?|sed\s+(?:-i|--in-place)\S*\s+\S+\s+|patch\s|git\s+apply\s|git\s+(?:checkout|restore)\s+(?:--\s+)?|Out-File\s+|Set-Content\s+|Add-Content\s+|Copy-Item\s+\S+\s+|Move-Item\s+\S+\s+|cp\s+\S+\s+|mv\s+\S+\s+)\s*['"]?([\w./@\\-]+\.(?:ts|tsx|css|js|jsx))/gi;
  // Write pattern must directly target the override file — a mere mention
  // (e.g. in a commit message) must not trip this.
  if (/(?:>>?\s*|tee\s+(?:-a\s+)?|Set-Content\s+(?:-Path\s+)?|Add-Content\s+(?:-Path\s+)?|Out-File\s+(?:-FilePath\s+)?|New-Item\s+\S*\s*|touch\s+|sed\s+-i\S*\s+\S+\s+|cp\s+\S+\s+|mv\s+\S+\s+|Copy-Item\s+\S+\s+|Move-Item\s+\S+\s+)['"]?[^\s'"]*ROUTE_OVERRIDE/i.test(cmd)) {
    emit("deny", "⛔ .claude/ROUTE_OVERRIDE is user-only — it cannot be created or modified from inside the session. Ask the user to add the path themselves.");
  }
  const agent = String(data?.agent_id ?? data?.subagent_type ?? "").toLowerCase();
  if (!agent) { // orchestrator only; subagents already handled below
    let match;
    while ((match = BASH_WRITE_RE.exec(cmd)) !== null) {
      const targetPath = match[1];
      if (SRC_CATCHALL.test(targetPath) || EDGE_CATCHALL.test(targetPath)) {
        const domainMatch = DOMAINS.find(([re]) => re.test(targetPath));
        const specialist = domainMatch ? domainMatch[1] : "the appropriate specialist (check the CLAUDE.md routing table)";
        if (consumeOverride(targetPath)) continue;
        emit("deny",
          `⛔ BASH WRITE BYPASS (v4, hard deny) — the command writes to "${targetPath}", a specialist-domain source file. ` +
          `The orchestrator does NOT write source files via shell commands. ` +
          `Spawn ${specialist} to make this change instead.`
        );
      }
    }
  }
  process.exit(0); // all non-matching Bash/PowerShell pass
}

const path = String(data?.tool_input?.file_path ?? "");
if (!path) process.exit(0);

// The override file is user-only — created outside the session, never by a tool.
if (/ROUTE_OVERRIDE$/i.test(path)) {
  emit("deny", "⛔ .claude/ROUTE_OVERRIDE is user-only. Ask the user to add the path to it themselves if an inline edit is genuinely required.");
}

const agent = String(data?.agent_id ?? data?.subagent_type ?? "").toLowerCase();
const agentId = String(data?.agent_id ?? "") || "orchestrator";
const agentType = String(data?.agent_type ?? data?.subagent_type ?? "") || "orchestrator";

// --- subagent out-of-scope check ---
if (agent && SCOPE[agent] && !SCOPE[agent].test(path)) {
  emit("deny", `${agent} is editing ${path}, outside its declared scope. Hand back to the orchestrator — workers never edit out of scope.`);
}

// --- domain-level exclusion (parallel safety) ---
const domainHit = DOMAINS.find(([re]) => re.test(path));
if (domainHit) {
  const domainId = domainHit[2];
  const locks = readLocks();
  const held = locks[domainId];
  if (lockActive(held) && held.agent !== agentId) {
    emit(
      "deny",
      `Domain \`${domainId}\` is locked by ${held.agentType || held.agent} (editing ${held.file} since ${fmtSince(held.at)}). ` +
      `Wait for that agent to finish, or run \`node .claude/hooks/clear-domain-locks.mjs\` to clear stale locks.`
    );
  }
  if (agent) {
    locks[domainId] = { agent: agentId, agentType, file: path, at: new Date().toISOString() };
    writeLocks(locks);
  }
}

// inside any spawned specialist -> routing already satisfied, stay out.
if (agent) process.exit(0);

// --- ORCHESTRATOR INLINE-EDIT CHECK (STRICT MODE) ---

// Allow orchestrator to edit non-source files (memory, root docs, config, hooks, agents, migrations)
if (ORCHESTRATOR_ALLOWED.some(re => re.test(path))) process.exit(0);

// v5: docs/skills route to their doc workers — deny with the worker name
const docRoute = DOC_ROUTES.find(([re]) => re.test(path));
if (docRoute) {
  if (consumeOverride(path)) process.exit(0);
  emit("deny",
    `DOC ROUTING (v5) — "${path}" belongs to a doc worker. Spawn ${docRoute[1]} with the exact content/diff to apply. ` +
    `memory/ and root CLAUDE.md remain orchestrator-editable. ` +
    `If genuinely no worker applies, ask the USER to add this path to .claude/ROUTE_OVERRIDE.`);
}

// Block ALL source code edits by orchestrator
const isSourceFile = SRC_CATCHALL.test(path) || EDGE_CATCHALL.test(path);
if (!isSourceFile) process.exit(0); // not a source file, allow

// User-granted one-shot override for this exact path?
if (consumeOverride(path)) process.exit(0);

// Load + increment violation counter
let v = { count: 0 };
try { if (existsSync(LOG)) v = JSON.parse(readFileSync(LOG, "utf8")); } catch {}
v.count = (v.count || 0) + 1;
v.last = { path, specialist: domainHit ? domainHit[1] : "unknown — check the CLAUDE.md routing table", at: new Date().toISOString() };
try { writeFileSync(LOG, JSON.stringify(v, null, 2)); } catch {}

// Build the block message
const specialistName = domainHit ? domainHit[1] : "the appropriate specialist (check the CLAUDE.md routing table)";

const ladder = {
  1: `⛔ ROUTING VIOLATION #1 — "${path}" is source code. The orchestrator does NOT edit source files. Spawn ${specialistName} to make this change.`,
  2: `⛔ ROUTING VIOLATION #2 — STOP. You are editing source code inline AGAIN. Call advisor() to justify, or spawn ${specialistName}. This is the second violation this session.`,
};
const msg = ladder[v.count] ||
  `⛔ ROUTING VIOLATION #${v.count} — Re-read CLAUDE.md "Agent accountability" and the routing table NOW. ${v.count} violations this session. The orchestrator coordinates — specialists write code. Spawn ${specialistName}.`;

emit("deny", msg + ` If NO specialist genuinely applies, ask the USER to add this path to .claude/ROUTE_OVERRIDE (user-only, one path per line) and retry.`);
