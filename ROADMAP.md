# OpenDiscipline Master Roadmap

This is the single source of truth for OpenDiscipline implementation planning.

It defines:
- what is being built;
- why it exists;
- implementation order;
- workflow and memory architecture;
- acceptance criteria;
- required tests and evidence;
- explicit non-goals;
- current implementation status.

Do not create a second roadmap or TODO list elsewhere. Detailed research evidence belongs in \`RESEARCH.md\`; runtime compatibility evidence belongs in \`COMPATIBILITY.md\`. Those files support this roadmap but do not define project priority or status.

## Project contract

OpenDiscipline is an OpenCode V1 engineering-discipline layer for agentic software development.

Architecture:

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
        +--> preserve/require evidence where the host makes it observable
        |
        v
    OpenCode tools / filesystem / shell / tests / runtime

Core principles:

1. Instructions teach the agent how to work.
2. Tool-boundary enforcement controls consequential operations.
3. Source and observed execution evidence outrank generated memory.
4. BLOCK requires strong observable evidence.
5. WARN is preferred where semantic context is ambiguous.
6. No bypass, weakened test, false green, or unsupported completion claim.
7. No network dependency in the enforcement hot path.
8. OpenCode V1 only; never add V2 lifecycle APIs without a deliberate compatibility revision.
9. A feature is complete only when implementation, validation, review, documentation, and relevant end-user evidence are present.
10. Research findings justify controls; they do not automatically justify a regex or BLOCK rule.

---

# Status legend

- [x] implemented and tested/documented
- [~] partially implemented; remaining acceptance criteria are listed
- [ ] planned
- [!] blocked by missing/unsupported host evidence

A checkbox is never marked complete merely because code exists. It requires implementation + tests + documentation + supported-host validation where applicable.

---

# Phase 0 — Guardrail foundation

Status: [x]

Purpose: protect high-confidence invariants at consequential OpenCode tool boundaries.

Completed:
- deterministic write-boundary enforcement;
- domain-first/product naming discipline;
- credential-shaped secret detection;
- swallowed-error detection;
- debug residue detection;
- cross-language suppression detection;
- protected path writes;
- protected sensitive reads;
- test-oracle integrity checks;
- regression-evidence warning;
- guardrail self-protection;
- destructive shell/Git command protection;
- completion-evidence warning;
- validation-repetition warning;
- low-noise/idempotent policy context.

Acceptance:
- high-confidence violations can be blocked at \`tool.execute.before\`;
- ambiguous violations warn instead of pretending to be certain;
- each rule has observable evidence and positive/negative/exception tests;
- core guardrail paths cannot be modified through normal guarded writes;
- tests never weaken themselves to satisfy this phase.

---

# Phase 1 — Universal evidence, scope, and rule contracts

Status: [~]

## 1.1 Universal rule contract

Status: [x]

Every registered rule declares:
- category;
- default severity;
- observable evidence;
- legitimate exception model;
- bypass analysis;
- positive/negative/exception test requirements.

Registry behavior:
- invalid rule contracts are rejected;
- findings without evidence are suppressed;
- suppressed findings produce a contract warning;
- duplicate findings are deduplicated;
- rule exceptions fail safely as warnings rather than crashing enforcement.

## 1.2 Scope / intent ledger

Status: [x]

Implementation:
- capture the first real user intent through the V1 message transform hook;
- record only explicitly declared path evidence;
- compare changed paths against explicit task paths;
- fall back to change-surface evidence when no explicit path intent exists.

Do not infer path intent from vague natural language.

## 1.3 Root-cause / fix evidence

Status: [~]

Implemented:
- session-local warning when code changes occur before observable regression-test evidence.

Remaining:
- connect an actual failure signal to a regression test;
- establish whether the regression test existed before the fix or was introduced as part of the fix;
- never infer semantic correctness from source text.

Constraint:
- OpenCode V1 does not currently provide a portable command exit-code event through the plugin boundary, so do not claim failure-to-fix linkage until actual host evidence supports it.

---

# Phase 1.5 — Agentic workflow layer

Status: [~]

Goal: adopt proven workflow patterns without installing Superpowers/Kiro/Antigravity/etc. as project dependencies.

The native workflow is instruction/skill driven. It is not a replacement for enforcement.

## Workflow levels

### L0 — Trivial

Use for isolated documentation, formatting, typo, or similarly bounded work.

Required:
- understand request;
- perform the change;
- perform a lightweight relevant check when one exists.

No formal artifact required.

### L1 — Small

Use for small bounded bugfixes, refactors, or behavior changes.

Required:
- concise intent;
- bounded task;
- relevant validation;
- completion evidence.

### L2 — Feature

Use for user-visible features, multi-step work, or meaningful integration risk.

Required artifacts:
- intent;
- requirements + acceptance criteria;
- implementation plan;
- tasks;
- verification;
- walkthrough at completion;
- design when architecture/data flow/persistence/failure handling/security decisions materially matter.

### L3 — Architectural / high risk

Use for migrations, security-sensitive work, major architecture changes, or substantial cross-package/user impact.

Required:
- intent;
- requirements;
- design;
- implementation plan;
- task decomposition;
- per-task verification;
- spec-compliance review;
- code-quality review;
- end-user verification where applicable;
- walkthrough.

## Canonical lifecycle

    Intent
      -> Requirements / bug behavior
      -> Design when materially required
      -> Implementation plan
      -> Tasks
      -> Implement
      -> Verify
      -> Spec-compliance review
      -> Code-quality review
      -> End-user verification
      -> Walkthrough / handoff

## Artifact contracts

intent:
- user-visible outcome;
- no invented requirements.

requirements:
- what must be true;
- observable acceptance criteria.

design:
- architecture/data flow;
- interfaces;
- persistence;
- failure handling;
- security/trust boundaries;
- validation strategy;
- only material decisions.

plan:
- implementation sequence;
- files/components;
- dependencies;
- validation;
- material risks.

tasks:
- small independently verifiable units;
- requirement IDs;
- likely files/components;
- dependencies;
- verification method.

verification:
- observed evidence only;
- separate automated tests, static checks, runtime checks, and user checks;
- never write "passed" without observed output.

walkthrough:
- what changed;
- requirements addressed;
- validation evidence;
- user-visible verification;
- limitations/follow-up.

## Review model

Every L2/L3 implementation receives two distinct reviews:

1. Spec compliance:
   - every requirement;
   - every acceptance criterion;
   - requested behavior;
   - scope.

2. Code quality:
   - architecture;
   - error handling;
   - maintainability;
   - tests;
   - unnecessary complexity.

Passing one does not imply passing the other.

## Implementation tasks remaining

- [x] workflow specification established;
- [x] L0-L3 classification established;
- [x] native OpenCode workflow skill established;
- [x] workflow regression tests established;
- [ ] requirements -> task traceability;
- [ ] task state tied to observed implementation evidence;
- [ ] verification evidence bound to task completion;
- [ ] representative feature/bugfix/refactor/trivial fixtures;
- [ ] machine-readable workflow state.

Acceptance:
- workflow does not create unnecessary ceremony;
- a completed task has observable implementation + verification evidence;
- workflow instructions cannot justify bypassing enforcement.

---

# Phase 1.6 — Context and memory architecture

Status: [~]

Goal: survive context compaction, session restart, and delegation without treating the conversation transcript as the system of record.

Research-backed design:
- long context does not reliably solve agent memory;
- selective retrieval is more useful than indiscriminate context dumping;
- stable task state, condensed memory, and recent interaction should be treated separately;
- repository source and observed validation must outrank generated summaries.

See \`RESEARCH.md\` for source-by-source evidence.

## Memory hierarchy

Highest trust to lowest:

    actual source code / repository state
        >
    observed validation/runtime evidence
        >
    task artifacts
        >
    project documentation
        >
    generated memory
        >
    conversational recollection

Memory never overrides observable repository state.

## Durable task checkpoint

Status: [x] primitive implemented

Schema v1:

    schemaVersion
    sessionID
    objective
    taskIntent
    activeTask
    completedTasks
    blockedTasks
    decisions
    affectedFiles
    validation
    nextMove
    updatedAt

Memory decisions have:
- id;
- statement;
- status: active | stale | superseded | invalid;
- source;
- optional evidence references.

Memory sources:
- source;
- validation;
- task-artifact;
- project-doc;
- generated-summary;
- conversation.

Authoritative memory sources are only:
- source;
- validation.

## Persistence guarantees

Implemented:
- project/session-isolated path;
- versioned schema;
- malformed-state rejection;
- atomic temporary-file write followed by rename;
- local file mode 0600 on POSIX-compatible systems.

Tests cover:
- schema validity;
- invalid memory rejection;
- persistence/reload;
- validation evidence recovery;
- checkpoint merge.

## Remaining memory work

### 1. Lifecycle integration
[~]

Implemented in the plugin lifecycle using the already-established V1 message/tool/event boundaries. Runtime compatibility still requires CI/host evidence before this item can become [x].

Required behavior:

    session/message boundary
      -> load checkpoint once per session
      -> restore relevant state
      -> work
      -> checkpoint after meaningful file changes / validation
      -> best-effort final checkpoint on session.idle

The implementation does not depend on an unverified compaction-specific V1 API. A future compaction hook can be added only after binary/source compatibility evidence is recorded.

### 2. Checkpoint triggers
[ ]

Checkpoint at:
- meaningful task boundaries;
- before subagent handoff;
- before context-heavy operations;
- after validation evidence;
- before completion.

Do not checkpoint every token/tool event.

### 3. Selective retrieval
[ ]

Implement deterministic relevance selection.

Retrieve only memory related to:
- current task;
- affected files;
- active requirements;
- relevant decisions;
- current blockers;
- validation history.

Never inject the entire project history.

### 4. Freshness / invalidation
[ ]

Use statuses:
- active;
- stale;
- superseded;
- invalid.

Rules:
- source changes can invalidate derived memory;
- newer decisions supersede older decisions;
- observed validation can replace claims;
- stale memory must not be presented as current fact.

### 5. Subagent handoff packet
[ ]

Send a compact structured packet:

    objective
    requirements
    current task
    scope
    relevant files
    constraints
    existing evidence
    expected output

Do not forward the full parent transcript by default.

### 6. Recovery fixtures
[ ]

Prove recovery from:
- context compaction simulation;
- session restart;
- interrupted task;
- failed validation;
- subagent handoff.

### 7. Memory benchmark
[ ]

Compare:

    no memory
    raw transcript
    summary-only
    structured checkpoint
    structured checkpoint + selective retrieval

Measure:
- task success;
- token usage;
- tool calls;
- recovery success;
- stale-memory errors;
- wrong-memory retrieval;
- handoff success.

No memory architecture should be declared superior without measurements on representative fixtures.

---

# Phase 2 — Ecosystem adapters

Status: [~]

Rule logic remains language-agnostic. Adapters translate ecosystem-specific evidence into the common rule model.

## JavaScript / TypeScript / web

Completed:
- ESM/CommonJS/dynamic import baseline;
- package.json dependency inventory;
- TypeScript/ESLint suppression detection;
- package-lock baseline;
- local installed API/version truth.

Remaining:
- workspace/package alias resolution;
- unused import/change detection.

## Python / ML

Completed:
- import extraction baseline;
- requirement/pyproject inventory baseline;
- mypy/pyright/Ruff suppression detection.

Remaining:
- correct PEP 621/tool-specific dependency parsing;
- import-name -> distribution mapping without guesses;
- uv/Poetry/Pipenv consistency;
- notebook validation;
- unused import/change detection.

## Go

Completed:
- import extraction baseline;
- go.mod inventory;
- nolint/lint suppression detection.

Remaining:
- go.work/module-aware resolution;
- AST-backed extraction;
- go.sum consistency.

## Rust

Completed:
- use/import extraction;
- Cargo inventory;
- allow/expect suppression detection.

Remaining:
- workspace-aware manifests;
- Cargo.lock;
- feature/target-aware dependency truth.

## Kotlin / Java / Android

Completed:
- import extraction;
- suppression detection.

Remaining:
- Gradle version catalogs;
- Maven dependency inventory;
- Android source set/flavor resolution;
- generated source boundaries;
- Compose/resource-specific validation.

## C# / .NET

Completed:
- suppression detection.

Remaining:
- PackageReference/project graph;
- solution/project boundaries;
- analyzer severity;
- NuGet lock/asset consistency.

## Dart / Flutter

Completed:
- analyzer suppression;
- pubspec inventory.

Remaining:
- pubspec.lock;
- workspace resolution;
- generated-file boundaries.

## Swift / Apple

Completed:
- broad validation detection.

Remaining:
- Package.swift;
- Xcode project/workspace evidence;
- generated-source boundaries;
- test-target evidence.

## C / C++

Completed:
- broad include extraction.

Remaining:
- CMake boundaries;
- compile-command evidence;
- generated headers/sources;
- compiler-warning suppression beyond generic NOLINT.

---

# Phase 3 — Dependency and architecture truth

Status: [~]

Completed:
- declared-vs-imported dependency baseline;
- explicit architecture boundaries;
- local installed API/version truth;
- manifest/lockfile baseline;
- dependency-addition warning.

Remaining:
- dependency removal review;
- duplicate/existing abstraction detection;
- workspace/package boundary enforcement;
- generated-code boundary enforcement.

Design rule:
- dependency truth is local/offline;
- do not query registries in the enforcement hot path;
- do not claim a package/version is vulnerability-free from local evidence alone.

---

# Phase 4 — Agent trajectory controls

Status: [~]

Completed:
- validation repetition warning.

Remaining:
- meaningful-progress detection;
- failure-loop breaker once actual failure evidence exists;
- abandoned/speculative change detection;
- unused new symbol/import detection;
- temporary workaround detection;
- revert/churn detection;
- human escalation signal after repeated non-progress.

The trajectory layer must distinguish:
- legitimate iteration;
- repeated identical failure;
- productive change;
- churn.

Do not block simply because an agent makes multiple attempts.

---

# Phase 5 — Security and trust boundaries

Status: [~]

Completed:
- sensitive-file read protection;
- guardrail self-protection;
- destructive shell/Git protection.

Remaining:
- untrusted repository-content classification;
- prompt-injection boundary guidance;
- tool-output trust classification;
- protected configuration provenance;
- command indirection/alias normalization;
- complete shell-language coverage.

Security rules must remain evidence-based. Prompt-injection defense must not pretend that arbitrary text classification creates a perfect security boundary.

---

# Phase 6 — OpenCode V1 compatibility

Status: [~]

Completed:
- core enforcement on \`tool.execute.before\`;
- supplementary permission hook;
- optional context transform;
- source verification for selected historical V1 releases;
- plugin-boundary child-session enforcement verification at hook level.

Current target:
- local OpenCode V1 binary smoke procedure and machine-readable evidence bundle;
- PR CI remains host-independent.

Required runtime evidence:
1. plugin loads;
2. \`tool.execute.before\` fires;
3. guarded write is blocked;
4. warning-only rule emits evidence without blocking;
5. optional-hook omission does not disable core enforcement;
6. child session receives the same core enforcement.

Historical releases remain regression references rather than the primary daily target.

Do not mark a release supported from SDK types or source inspection alone.

---

# Phase 7 — Quality and maintainability

Status: [ ]

Remaining:
- false-positive corpus;
- cross-language fixture corpus;
- hot-path performance benchmark;
- cached dependency discovery;
- structured finding codes;
- machine-readable diagnostics;
- documentation/implementation consistency checks;
- Node/OpenCode V1 CI matrix.

Performance rule:
- no broad repository scans in hot hooks unless explicitly justified and benchmarked.

---

# Research evidence and design references

The detailed source analysis lives in \`RESEARCH.md\`. Key workflow/context references include:

- Superpowers: https://github.com/obra/superpowers
- Kiro Specs: https://kiro.dev/docs/specs/
- Antigravity walkthrough: https://antigravity.google/docs/walkthrough
- Antigravity implementation plan: https://www.antigravity.google/docs/implementation-plan
- Claude Code: https://code.claude.com/docs/
- OpenAI Codex developer guidance: https://developers.openai.com/codex/
- Aider repository map: https://aider.chat/docs/repomap.html
- SWE-ContextBench: https://arxiv.org/abs/2602.08316
- Context as a Tool / Findings of ACL 2026: https://aclanthology.org/2026.findings-acl.1032/
- RepoCoder: https://arxiv.org/abs/2303.12570
- LongCodeBench: https://arxiv.org/abs/2505.07897

These references justify workflow/context-management patterns. They do not constitute proof that one product or one memory mechanism is universally superior.

---

# Explicit non-goals

Never add a feature that violates these constraints without changing this roadmap first:

- no universal semantic-correctness oracle;
- no automatic architecture judgment presented as fact;
- no network dependency lookup in the write hot path;
- no rule that blocks legitimate exceptions merely because a suppression exists;
- no V2 lifecycle API;
- no giant regex catalogue without evidence and tests;
- no memory dump of the full project history into every context;
- no generated memory that outranks source/runtime evidence;
- no false completion claim based only on artifact existence;
- no weakening tests or bypassing failed guardrails to make CI green.

---

# Definition of Done

A roadmap item becomes [x] only when all applicable conditions hold:

1. implementation exists;
2. behavior is covered by positive tests;
3. important non-violation/exception behavior is covered;
4. documentation matches implementation;
5. no known bypass was ignored;
6. relevant CI is green;
7. OpenCode V1 host behavior is validated where the item depends on host behavior;
8. research-derived controls are traceable to \`RESEARCH.md\`;
9. no claim exceeds the evidence available.

For workflow/memory features, add:
10. representative recovery or fixture testing;
11. context/token cost measurement where context behavior is involved.

This definition prevents "implemented" from degenerating into "code exists".
