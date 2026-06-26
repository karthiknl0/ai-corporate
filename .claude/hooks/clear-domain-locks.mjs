#!/usr/bin/env node
// Manually clear domain locks held by route-guard.mjs.
// The orchestrator runs this when an agent crashed/aborted mid-edit and left a
// stale lock that hasn't yet hit its 10-min TTL.
//
//   node .claude/hooks/clear-domain-locks.mjs            # clear ALL locks
//   node .claude/hooks/clear-domain-locks.mjs gst-specialist [<domain> ...]
//
// Domain ids match the 3rd element of DOMAINS in route-guard.mjs
// (e.g. sales-purchase-specialist, gst-specialist, migrations, agent-commission).
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const LOCKS = ".claude/memory/domain-locks.json";
const targets = process.argv.slice(2);

let locks = {};
if (existsSync(LOCKS)) {
  try { locks = JSON.parse(readFileSync(LOCKS, "utf8")) || {}; }
  catch { console.error(`Could not parse ${LOCKS} — leaving it untouched.`); process.exit(1); }
}

const active = Object.entries(locks).filter(([, l]) => l && l.at);
if (active.length === 0) {
  console.log("No domain locks held.");
  process.exit(0);
}

if (targets.length === 0) {
  // Clear everything.
  for (const [domain, l] of active) console.log(`Cleared lock on \`${domain}\` (was ${l.agentType || l.agent}, file ${l.file}).`);
  writeFileSync(LOCKS, JSON.stringify({}, null, 2));
  process.exit(0);
}

// Clear only the named domains.
let cleared = 0;
for (const domain of targets) {
  const l = locks[domain];
  if (l && l.at) {
    console.log(`Cleared lock on \`${domain}\` (was ${l.agentType || l.agent}, file ${l.file}).`);
    delete locks[domain];
    cleared++;
  } else {
    console.log(`No active lock on \`${domain}\`.`);
  }
}
if (cleared) writeFileSync(LOCKS, JSON.stringify(locks, null, 2));
