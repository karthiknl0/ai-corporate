#!/usr/bin/env node
// PreToolUse guard for Edit / Write tool calls — enforces the mandatory
// specialist-routing rule (CLAUDE.md "Agent accountability"). The orchestrator
// is the one who decides whether to spawn a specialist or edit inline, so a
// prose rule alone is self-policed ("fox guarding the henhouse"). This hook is
// run by the HARNESS, not by Claude, so it cannot be reasoned past in the moment.
//
// Behaviour:
//   - Edit/Write to a specialist-domain path, NOT inside a spawned subagent
//     -> "ask" naming the required specialist (1st = warn-block, escalates).
//   - Edit/Write by a subagent OUT of its declared scope (e.g. docs-scribe
//     touching src/**) -> "deny".
//   - everything else -> silent (no decision).
//
// Violation tally + escalation is persisted to .claude/memory/route-violations.json
// so it survives across the session and loads as context next time.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const LOG = ".claude/memory/route-violations.json";
const LOCKS = ".claude/memory/domain-locks.json";
const LOCK_TTL_MS = 10 * 60 * 1000; // 10 min — agents rarely run longer

// path glob (RegExp) -> [required specialist (display), domain id (lock key)].
// First match wins. The domain id is a clean, stable key for the lock file;
// the display string may be verbose ("postgres-writer (apply needs approval)")
// and must NOT be used as a JSON key.
const DOMAINS = [
  [/supabase[\\/]functions[\\/]/i, "edge-fn-specialist", "edge-fn-specialist"],
  [/[\\/]migrations[\\/].*\.sql$/i, "postgres-writer (apply needs approval)", "migrations"],
  [/Sale(Create|Edit|View|Convert)/i, "sales-purchase-specialist", "sales-purchase-specialist"],
  [/Purchase(s|Create|View|Convert)/i, "sales-purchase-specialist", "sales-purchase-specialist"],
  [/Inventory/i, "inventory-specialist", "inventory-specialist"],
  [/(Tax|TaxReturns|eInvoice)/i, "tax-specialist", "tax-specialist"],
  [/(LedgerEntry|bank-reconciliation|LedgerStatement)/i, "accounting-specialist", "accounting-specialist"],
  [/(Reports|useReports)/i, "reports-print-specialist", "reports-print-specialist"],
  [/(storefront|shop|portal)/i, "storefront-portal-specialist", "storefront-portal-specialist"],
  [/Payroll/i, "payroll domain — accounting specialist", "payroll"],
];

// subagent identity -> RegExp of paths it is ALLOWED to write. Anything else = deny.
const SCOPE = {
  "docs-scribe": /\.(md)$/i,
  "skill-updater": /\.agents[\\/]skills[\\/].*\.md$/i,
  "migration-file-writer": /[\\/]migrations[\\/].*\.sql$/i,
  "code-mapper": /\.(md)$/i,
  "comms-manager": /\.(md|txt)$/i,
};

// --- domain lock helpers (fail-open: any error -> no lock enforced) ---
// NOTE: plain read-modify-write JSON, NOT atomic. Two near-simultaneous hooks
// can both read then both write (TOCTOU). Acceptable under "keep it simple";
// the 10-min TTL + per-instance agentId keep the blast radius small.
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

const path = String(data?.tool_input?.file_path ?? "");
if (!path) process.exit(0);

// agent_id is set by the harness when the call comes from inside a spawned subagent.
const agent = String(data?.agent_id ?? data?.subagent_type ?? "").toLowerCase();

// Per-instance lock identity vs. display name. Confirmed empirically against
// this harness: agent_id is a UNIQUE per-instance hash (e.g. "ab4a850d154ec2d97")
// and stays stable across multiple edits by the same agent; agent_type is the
// type name (e.g. "sales-purchase-specialist"). So two same-type specialists
// get distinct agentIds — exactly what the domain lock needs to tell them apart.
const agentId = String(data?.agent_id ?? "") || "orchestrator";
const agentType = String(data?.agent_type ?? data?.subagent_type ?? "") || "orchestrator";

// --- subagent out-of-scope check (question 5) ---
if (agent && SCOPE[agent] && !SCOPE[agent].test(path)) {
  emit("deny", `${agent} is editing ${path}, outside its declared scope. Hand back to the orchestrator — workers never edit out of scope.`);
}

// --- domain-level exclusion (runs for BOTH subagent and orchestrator edits) ---
// This MUST be above the `if (agent) process.exit(0)` below: the headline
// conflict ("two sales-purchase agents at once") is between spawned SUBAGENTS,
// whose calls carry agent_id and would otherwise exit before any lock check.
// Only specialist domains are locked — docs/skills (.md) never match DOMAINS.
const domainHit = DOMAINS.find(([re]) => re.test(path));
if (domainHit) {
  const domainId = domainHit[2];
  const locks = readLocks();
  const held = locks[domainId];
  // Conflict CHECK applies to everyone (subagent or orchestrator).
  if (lockActive(held) && held.agent !== agentId) {
    emit(
      "deny",
      `Domain \`${domainId}\` is locked by ${held.agentType || held.agent} (editing ${held.file} since ${fmtSince(held.at)}). ` +
      `Wait for that agent to finish, or run \`node .claude/hooks/clear-domain-locks.mjs\` to clear stale locks.`
    );
  }
  // ACQUIRE only on the clean-allow path = inside a spawned subagent (it exits 0
  // just below). The orchestrator path only emits "ask" (the edit may be declined,
  // and heeding the ask means spawning the specialist) — if the orchestrator
  // acquired here, the specialist it then spawns would be DENIED by the
  // orchestrator's own stale lock. So orchestrator inline edits are checked but
  // never acquire. (Two top-level orchestrator sessions both read as
  // "orchestrator" and won't block each other inline — out of scope; the conflict
  // this guards is between subagents.)
  if (agent) {
    locks[domainId] = { agent: agentId, agentType, file: path, at: new Date().toISOString() };
    writeLocks(locks);
  }
}

// inside any spawned specialist -> routing already satisfied, stay out.
if (agent) process.exit(0);

// --- orchestrator inline-edit check (questions 1-3) ---
if (!domainHit) process.exit(0);
const [, specialist] = domainHit;

let v = { count: 0 };
try { if (existsSync(LOG)) v = JSON.parse(readFileSync(LOG, "utf8")); } catch {}
v.count = (v.count || 0) + 1;
v.last = { path, specialist, at: new Date().toISOString() };
try { writeFileSync(LOG, JSON.stringify(v, null, 2)); } catch {}

const ladder = {
  1: `VIOLATION #1 — specialist routing skipped. ${path} is ${specialist}'s domain. Spawn it instead of editing inline. Proceed only if you have a documented reason.`,
  2: `VIOLATION #2 this session — STOP. Call advisor() to justify going inline before any further specialist-domain edit, then spawn ${specialist}.`,
};
const msg = ladder[v.count] ||
  `VIOLATION #${v.count} this session — re-read the CLAUDE.md routing table and "Agent accountability" section before continuing. ${specialist} owns ${path}.`;

emit("ask", msg);
