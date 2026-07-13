---
name: skill-library-bootstrap
description: Load when the user wants to build a skill library for a project — "create skills for this repo", "knowledge transfer before I lose the expensive model", "make this project workable by Sonnet/cheaper sessions", a pasted variant of the Rodbourn "Fable departure" prompt, or starting the skill layer of a NEW project. Covers gap-analysis-before-authoring, the discovery phase, the skill taxonomy menu, authoring rules, the 3-reviewer pipeline, transfer evals, and long-term maintenance. NOT for writing one individual skill and NOT for orchestrating agents (use fable-orchestration).
---

# Skill Library Bootstrap — turning a project into something cheaper models can carry

Goal: after this process, a zero-context mid-level engineer or Sonnet-class session can debug, extend, and validate the project at the standard the departing expert held. The skill library is the transfer medium.

**When NOT to use:** single-skill requests; projects that already have a mature library (run Phase 0 only, then gap-fill); orchestration questions (fable-orchestration).

---

## Phase 0 — Gap analysis BEFORE authoring (the step every template skips)

The taxonomy below is a **menu, not a mandate**. Field experience (2026-07-12, a mature production ERP repo): the 16-item taxonomy was already ~90% instantiated under a different directory layout — a 105-file skill library plus hook enforcement; blind instantiation would have produced a duplicate corpus violating one-home-per-fact.

1. Inventory what exists: `CLAUDE.md` / `AGENTS.md`, `docs/`, `.claude/skills/`, `.agents/`, wikis, READMEs, memory files.
2. Map each taxonomy item → existing home (a table). Coverage counts even when the name differs — a numbered bug-history file IS failure-archaeology.
3. Author **only the gaps**. For covered items, the existing file stays the single home; new skills cross-reference it, never restate it.
4. Sizing: greenfield/small project → start with 3–5 skills (build-and-env, debugging-playbook, change-control, domain-reference) and let the rest accrete from real incidents. 10–16 is for mature repos with history to mine. A skill with no incident behind it is speculation.

## Phase 1 — Discovery (no authoring yet)

Investigate like an incoming principal engineer: README/manifest, build system, how tests are ACTUALLY run (verify a gate can fail before trusting it), CI config, git history (reverts, stalled branches, what got re-fought), TODO/FIXME hotspots, deploy conventions, project memory/notes.

Then ask the user **at most five questions**, only for what the repo cannot tell you:
1. Hardest live problem right now (feeds the campaign skill — skip it if blockers are external, not engineering-hard).
2. Unwritten discipline rules (things forbidden that no doc states).
3. Audience: which model tier / experience level, and what do they NOT know?
4. Which past failures cost the most time?
5. What does "beyond state of the art" mean here — or is this a production app where frontier/research skills should be skipped entirely?

Present findings + questions together; get answers before Phase 2. Structured option-questions beat open prose — users answer four option-questions faster than five essay-questions.

## Phase 2 — The taxonomy menu (adapt, merge, split)

CORE — most projects: change-control (non-negotiables + the incident behind each) · debugging-playbook (symptom→triage table; traps with their stories) · failure-archaeology (symptom → root cause → evidence → status; mine git history hard) · architecture-contract (load-bearing decisions + WHY; invariants; known-weak points stated plainly) · domain-reference (the field's math/protocols/standards AS APPLIED HERE, not a textbook) · config-and-flags (every configuration axis: options, defaults, prod-vs-experimental, how to add one) · build-and-env · run-and-operate · diagnostics-and-tooling (measure, don't eyeball; ship scripts in the skill's scripts/ dir) · validation-and-qa (what counts as evidence; golden inventory) · docs-and-writing (doc-pairing rules; house style).

ADVANCED — only when Phase 1 supports them: hardest-problem-campaign (numbered phases, exact commands, EXPECTED numbers at every gate, "if X instead → branch Y", wrong paths fenced off) · proof-and-analysis-toolkit (first-principles verification recipes with worked examples from THIS repo's history) · research-frontier + research-methodology (research repos only — skip for production apps; unproven frontier docs rot fastest) · external-positioning (only if the project publishes).

Authoring: one skill per agent, parallel, when using multi-agent workflows; the orchestrator writes each brief with the survey scope, gates, report schema, and stop condition (see fable-orchestration §2).

## Authoring rules (bake into every authoring brief)

- Audience: zero-context mid-level engineer or Sonnet-class model. Imperative runbook voice; copy-pasteable commands; every jargon term defined once; tables and checklists.
- Format: `.claude/skills/<name>/SKILL.md`, YAML frontmatter with `name` + trigger-rich `description` stating exactly when a model should load it AND when not to (name the sibling to use instead).
- **Ground truth only**: verify every command, flag, path, and claim against the repo before stating it. Wrong runbooks are worse than none.
- Embed knowledge; never make private/user-specific paths load-bearing. Never put secret VALUES in a skill — names and locations only.
- Date-stamp volatile facts. End every skill with **"Provenance and maintenance"**: one-line re-verification commands for anything that may drift.
- No oversell: unproven things stay labeled open/candidate. Nothing may contradict the project's own manifest/rules or route around its change-control.
- Write only inside the skills directory; rest of repo read-only; no mutating git commands in authoring agents.

## Phase 3 — Review (after ALL skills exist, three parallel reviewers + one fixer)

- **FACTUAL**: re-verify flags/paths/commands against the repo; severity = would it send an engineer down a wrong path?
- **DOCTRINE**: contradictions with project rules or between skills; overstated claims; missing gates on anything behavior-changing.
- **USABILITY**: trigger quality of descriptions; duplication (one home per fact); self-containedness; scannability.
- Fixer applies blocking+important findings. Deliver to the user: inventory with one-line descriptions, what was spot-checked, what remains uncertain.

## Phase 4 (optional but high-value) — Transfer eval + uncertainty register

- **Model-transfer eval**: give a fresh cheap-model session a real task from recent history with ONLY the skills as context. If it fails, the library has a hole — fix the skill, not the model. One passed eval is worth three reviews.
- **Uncertainty register**: one file listing every believed-but-unverified claim across the library, each with the command that would verify it. Review it whenever a skill is touched.

## Maintenance — how a library stays alive

- Every skill carries `last_verified`; re-verification is a body-diff or a cited commit SHA, never a bare date bump.
- Rules that matter graduate: prose skill → routing-table entry → **hook/CI enforcement** (this repo's route-guard/brief-guard hooks are the reference implementation). Prose depends on the model obeying it under context pressure; enforcement doesn't. If a rule is violated twice, mechanize it.
- New incident → the relevant skill gets the entry in the SAME commit as the fix. A library updated "later" is a library that drifts.
- Reality outranks any skill: on contradiction, update the file, date the correction, keep the history.

## Provenance and maintenance

- Synthesized 2026-07-12 from: Rodbourn's "Fable departure skill creation" gist (gist.github.com/Rodbourn/2a00499f8b6586f08403db193124067e, 2026-07-02) and two live runs — a gap-fill on a mature production ERP (105 pre-existing skills; only 3 genuinely missing pieces authored) and a greenfield bootstrap on a small Python tool (4 skills, sized per Phase 0 rule 4).
- Companion skill: `fable-orchestration` (dispatching the authoring/review agents).
- Re-check over time: the taxonomy list vs what new harness versions auto-provide (e.g. if the harness ships built-in build/run discovery, drop those from the menu).
