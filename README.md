# OpenDiscipline

OpenDiscipline is an OpenCode V1 engineering-discipline plugin for agent-driven software development. It combines concise workflow guidance with deterministic tool-boundary guardrails.

Its purpose is not to make an agent "smarter" by adding more instructions. Its purpose is to reduce recurring agent failure modes with observable evidence, conservative BLOCK/WARN decisions, validation, and explicit limits.

## Start here for a new agent session

This repository is intentionally split into an orientation layer and detailed evidence.

1. Read this `README.md` to understand the project, current state, rules, and document map.
2. Read `AGENTS.md`. It is the active repository-wide session policy.
3. Read `ROADMAP.md` before selecting implementation work. It is the single source of truth for status and implementation order.
4. Read `RESEARCH.md` before designing a new guardrail, workflow control, memory mechanism, or other research-derived behavior.
5. Read only the detailed document relevant to the task. Do not load every Markdown file merely because it exists.
6. For OpenCode V1 runtime/API work, read `COMPATIBILITY.md` and `docs/SMOKE-TEST.md`.
7. Implement the smallest justified unfinished roadmap item unless the user explicitly changes scope.
8. Do not claim completion from narration, generated memory, file existence, or a proxy/green check alone. Use observed evidence.
9. Never weaken a test, bypass a BLOCK, or rewrite the guardrail to make the current task appear successful.

The project deliberately separates authoritative status from explanatory material:

```text
README.md       -> orientation and document map
AGENTS.md       -> active agent behavior/policy
ROADMAP.md      -> canonical progress and next work
RESEARCH.md     -> external evidence and failure-model basis
COMPATIBILITY.md-> OpenCode V1 host/API evidence
docs/*          -> detailed procedures and workflow contracts
evals/*         -> deterministic behavioral evaluation
src/*           -> implementation
tests/*         -> automated verification
```

## Current project state

Branch: `maturity-hardening`

The repository is in the maturity-hardening stage. The guardrail foundation and most universal evidence/scope/workflow foundations are implemented, but the project is not complete.

Current roadmap state:

| Area | Status | Current meaning |
|---|---|---|
| Phase 0 — Guardrail foundation | [x] | Core deterministic guardrails are implemented and tested. |
| Phase 0.5 — Safe GitHub-only installation | [~] | Installer/update/rollback work exists; immutable release default and real-host/runtime verification remain. |
| Phase 1 — Evidence, scope, rule contracts | [~] | Universal contracts and scope ledger exist; failure-to-fix linkage still needs host evidence. |
| Phase 1.5 — Agentic workflow | [~] | L0–L3 workflow and evidence contracts exist; it remains a partially complete maturity phase. |
| Phase 1.6 — Context and memory | [~] | Checkpoint primitive and lifecycle foundations exist; checkpoint triggers, selective retrieval, freshness/invalidation, handoff packets, recovery fixtures, and benchmarking remain. |
| Phase 2 — Ecosystem adapters | [~] | Several language baselines exist; ecosystem-specific truth remains. |
| Phase 3 — Dependency/architecture truth | [~] | Core local/offline truth exists; workspace and abstraction-boundary work remains. |
| Phase 4 — Agent trajectory controls | [~] | Validation repetition exists; meaningful progress, churn, failure-loop, and escalation controls remain. |
| Phase 5 — Security/trust boundaries | [~] | Basic protections exist; untrusted-content and tool-output trust boundaries remain. |
| Phase 6 — OpenCode V1 compatibility | [~] | Source/hook evidence exists; actual binary smoke remains required. |
| Phase 7 — Quality/maintainability | [ ] | Corpus, performance, diagnostics, consistency checks, and broader CI work remain. |

The immediate roadmap sequence is Phase 1.6:

```text
checkpoint triggers
    -> selective retrieval
    -> freshness / invalidation
    -> subagent handoff packet
    -> recovery fixtures
    -> memory benchmark
```

Do not mark any of these complete merely because a function, schema, or document exists. The roadmap Definition of Done requires implementation, positive/negative/exception tests where applicable, documentation, CI, host evidence when required, research traceability, and evidence that does not overclaim.

## What problem OpenDiscipline addresses

Agentic coding failures are often trajectory and evidence failures rather than syntax failures. The project targets recurring problems such as:

- scope drift;
- speculative or oversized changes;
- swallowed errors;
- credential-shaped secret leakage;
- unsafe sensitive-file reads;
- destructive Git/shell operations;
- test suppression or weakened test oracles;
- changes without appropriate validation evidence;
- repeated validation attempts without useful progress;
- undeclared or locally unsupported dependencies;
- invalid architecture-boundary crossings;
- false completion and evidence overclaiming;
- stale or mismatched task memory.

Research in `RESEARCH.md` documents the external evidence behind these failure modes. Research does not automatically justify a new regex or BLOCK rule.

## Evidence model

OpenDiscipline treats these as different things:

```text
claim       = what the agent says happened
evidence    = what an observable source reports
verified    = what the current acceptance criteria have actually been shown to satisfy
```

They must never be collapsed into one "done" flag.

The trust model is approximately:

```text
agent narration / generated memory
        <
task artifacts
        <
current repository state
        <
observed validation / runtime evidence
```

The exact strength of evidence depends on provenance, freshness, and what requirement it actually tests.

A green test is evidence about that test. It is not automatically proof that the requested feature is semantically complete.

## Core architecture

```text
User intent
    |
    v
Workflow guidance
    |
    v
OpenDiscipline guardrail kernel
    |
    +--> BLOCK high-confidence invariant violations
    +--> WARN ambiguous evidence
    +--> preserve/require observable evidence
    |
    v
OpenCode tools / filesystem / shell / tests / runtime
```

The central rule is:

> Instructions tell the agent how the work should proceed. Tool-boundary enforcement controls consequential operations.

The enforcement path is local and offline. It does not require a network service or telemetry.

## Guardrails currently implemented

The core rule families include:

- domain-first naming discipline;
- swallowed-exception detection;
- credential-shaped secret detection;
- debug-residue detection;
- suppression detection across supported language ecosystems;
- TODO/FIXME/HACK warnings;
- protected-file writes;
- protected sensitive reads;
- test-integrity checks;
- regression/test-evidence warnings;
- change-surface control;
- dependency truth and dependency-change review;
- explicit architecture boundaries;
- destructive Git/shell protection;
- completion and validation-repetition evidence;
- guardrail self-protection;
- scope/intent ledger;
- workflow L0–L3 guidance.

Rules are intentionally narrow. BLOCK is reserved for strong observable evidence; ambiguous cases should normally WARN.

## What agents must do

For non-trivial work:

- establish the user's actual objective before changing code;
- use the smallest justified workflow level;
- preserve requirement -> task -> verification traceability for L2/L3 work;
- inspect current repository state instead of relying on stale memory;
- make bounded changes;
- validate continuously and record what was actually observed;
- distinguish spec compliance from code quality;
- review the final change against the requested behavior;
- leave enough evidence for the next session or delegated agent to continue safely;
- update roadmap status only when the Definition of Done is satisfied.

For memory/context work, current source and observed validation outrank checkpoints.

## What agents must not do

Do not:

- invent requirements;
- treat generated summaries as repository truth;
- claim a command passed when its result was not observed;
- equate a successful tool call with task completion;
- equate green tests with complete semantic correctness;
- load the entire project history into every context;
- silently broaden scope;
- bypass a BLOCK;
- weaken/delete tests to manufacture green;
- add a new guard merely because a theoretical failure is imaginable;
- add network calls to the enforcement hot path;
- add undocumented OpenCode V2 lifecycle APIs to this V1 project;
- mark roadmap work complete without its required evidence.

## Workflow levels

The workflow is adaptive rather than mandatory ceremony:

- L0 — trivial documentation/formatting/bounded work; lightweight check when relevant.
- L1 — small bounded bugfix/refactor; concise intent, bounded task, validation, completion evidence.
- L2 — feature/multi-step work; requirements, acceptance criteria, plan, tasks, verification, walkthrough, and design when materially required.
- L3 — architectural/high-risk work; explicit design, task decomposition, per-task verification, two-stage review, and end-user verification where applicable.

The canonical lifecycle is:

```text
intent
 -> requirements
 -> design when materially required
 -> plan
 -> tasks
 -> implement
 -> verify
 -> spec-compliance review
 -> code-quality review
 -> end-user verification
 -> walkthrough / handoff
```

Use `docs/WORKFLOW.md` and `.opencode/skills/open-discipline-workflow/SKILL.md` for the detailed contracts.

## Documentation map

There are currently 12 Markdown documents. They have different purposes; they are not interchangeable.

| Document | Purpose | Read when |
|---|---|---|
| `README.md` | Project orientation, current state, rules, and navigation | Every new session |
| `AGENTS.md` | Active repository-wide agent policy | Every new session |
| `ROADMAP.md` | Canonical implementation order, status, acceptance, Definition of Done | Before choosing work; before status changes |
| `RESEARCH.md` | External research and failure-model traceability | Before new controls/designs; when validating rationale |
| `COMPATIBILITY.md` | OpenCode V1 capability/source/runtime evidence | Runtime/API compatibility work |
| `docs/INSTALLATION.md` | Installer ownership, update/uninstall, rollback/recovery | Installer work or recovery |
| `docs/SMOKE-TEST.md` | Real OpenCode V1 runtime smoke procedure | Host/runtime verification |
| `docs/WORKFLOW.md` | Detailed L0–L3 workflow and artifact contracts | Non-trivial workflow work |
| `.opencode/skills/open-discipline-workflow/SKILL.md` | Native OpenCode workflow skill | When changing workflow behavior/skill |
| `evals/README.md` | Behavioral evaluation architecture and runner contract | Evaluation work |
| `evals/fixtures/README.md` | Fixture catalog and purpose | Evaluation fixture work |
| `docs/work/README.md` | Durable workflow-artifact layout | L2/L3 work needing artifacts |

The fixture-specific `evals/fixtures/trivial-doc/README.md` was intentionally removed because its two statements duplicated the fixture catalog and `trivial-doc.json` scenario contract. The executable scenario remains the authoritative evaluation definition.

## Installation and runtime verification

The installer is GitHub/Bun based rather than npm-published. See `docs/INSTALLATION.md`.

Installation success is not runtime compatibility proof. OpenCode V1 binary behavior must be established through the smoke procedure in `docs/SMOKE-TEST.md`; SDK types and source inspection are not sufficient.

## Development verification

Use the repository's declared checks:

```sh
npm install
npm test
npm run typecheck
```

For runtime behavior, use the OpenCode V1 smoke procedure. For behavioral evaluation, use the `evals/` contracts and runner.

## Adding or changing a guard

Before adding a rule, establish:

1. documented failure mode and external evidence where applicable;
2. observable evidence examined by the rule;
3. why that evidence is reliable;
4. BLOCK versus WARN semantics;
5. false-positive expectations;
6. legitimate exception/escape hatch;
7. bypass analysis;
8. positive, negative, and exception tests;
9. CI and relevant host validation;
10. documentation and research traceability.

Do not turn a research finding directly into a regex.

## Compatibility boundary

OpenDiscipline targets OpenCode V1. The core enforcement boundary is `tool.execute.before`. Optional hooks are supplementary.

Do not add undocumented V2 lifecycle APIs. Do not claim runtime compatibility from SDK types or host-source inspection alone.

## Non-goals

OpenDiscipline does not attempt to:

- prove universal semantic correctness with regexes;
- autonomously judge architecture;
- block every TODO/refactor;
- query dependency registries in the enforcement hot path;
- provide a perfect prompt-injection defense;
- dump full project history into every context;
- treat generated memory as higher authority than source/runtime evidence;
- make a green test suite equivalent to complete task correctness.

## License

See repository licensing files when present.
