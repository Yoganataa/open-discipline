# OpenDisipline Roadmap

OpenDisipline is intended to enforce universal engineering practices for agentic development without becoming a framework-specific linter.

The implementation order is deliberately phased. Do not mark an item complete because code exists; it is complete only when the behavior is implemented, tested, documented, and validated on the supported OpenCode V1 hook surface.

## Phase 0 — Core guardrail foundation

- [x] Deterministic write-boundary enforcement
- [x] Product/domain naming discipline
- [x] Secret-shaped credential detection
- [x] Swallowed-error detection
- [x] Debug residue detection
- [x] Cross-language suppression detection
- [x] Protected path writes
- [x] Protected sensitive reads
- [x] Test-oracle integrity checks
- [x] Regression-evidence warning
- [x] Guardrail self-protection
- [x] Destructive shell/Git command protection
- [x] Completion-evidence warning
- [x] Validation-repetition warning
- [x] Low-noise/idempotent policy context

## Phase 1 — Universal evidence and scope

- [x] Change-surface guard
- [x] Validation command detection across major ecosystems
- [x] Test-file/oracle evidence checks
- [x] Universal rule metadata contract baseline: category/default severity/evidence field
- [x] Rule finding deduplication across multi-file operations
- [ ] Universal rule contract: enforce evidence, legitimate exception, bypass analysis, and test requirements
- [ ] Scope/intent ledger
  - [ ] Record the initial task intent when a reliable V1 message hook is available.
  - [ ] Compare changed paths with the declared/observed task surface.
  - [ ] Degrade to change-surface evidence when task intent is unavailable.
- [ ] Root-cause/fix evidence
  - [ ] Connect a failure signal to a regression test.
  - [ ] Verify the regression test was present before the implementation fix or was introduced as part of the fix.
  - [ ] Never claim semantic correctness from source text alone.

## Phase 2 — Ecosystem adapters

The core rules stay language-agnostic. Adapters only translate ecosystem-specific evidence into the common rule model.

### JavaScript / TypeScript / web

- [x] Imports: ESM/CommonJS/dynamic import baseline
- [x] package.json dependency inventory
- [x] TypeScript/ESLint suppression detection
- [ ] Workspace/package alias resolution
- [x] Lockfile consistency (package.json/package-lock baseline)
- [x] Installed-package/API truth without network access (local Node resolution + package metadata baseline)
- [ ] Unused import/change detection

### Python / ML

- [x] import extraction baseline
- [x] requirements/pyproject dependency inventory baseline
- [x] mypy/pyright/Ruff suppression detection
- [ ] pyproject dependency parsing that respects PEP 621 and tool-specific sections
- [ ] import-name → distribution-name mapping without hard-coded guesses
- [ ] uv/Poetry/Pipenv environment/lockfile consistency
- [ ] notebook-specific validation and suppression handling
- [ ] unused import/change detection

### Go

- [x] import extraction baseline
- [x] go.mod dependency inventory baseline
- [x] nolint/lint:ignore suppression detection
- [ ] go.work/module-aware dependency resolution
- [ ] AST-backed import extraction to avoid string-literal false positives
- [ ] go.sum consistency checks

### Rust

- [x] use/import extraction baseline
- [x] Cargo dependency inventory baseline
- [x] allow/expect suppression detection
- [ ] workspace-aware Cargo manifest resolution
- [ ] Cargo.lock consistency
- [ ] feature/target-aware dependency truth

### Kotlin / Java / Android

- [x] import extraction baseline
- [x] @Suppress/@SuppressLint/tools:ignore detection
- [ ] Gradle version catalogs and dependency inventory
- [ ] Maven dependency inventory
- [ ] Android source-set/flavor-aware resolution
- [ ] generated-source boundaries
- [ ] Compose/resource-specific validation evidence

### C# / .NET

- [x] suppression detection
- [ ] PackageReference/project-reference inventory
- [ ] solution/project graph boundaries
- [ ] analyzer severity configuration checks
- [ ] NuGet asset/lock consistency

### Dart / Flutter

- [x] analyzer suppression detection
- [x] pubspec dependency inventory baseline
- [ ] pubspec.lock consistency
- [ ] workspace/package resolution
- [ ] generated-file boundaries

### Swift / Apple platforms

- [x] broad validation command detection
- [ ] Package.swift dependency inventory
- [ ] Xcode project/workspace dependency evidence
- [ ] generated-source boundaries
- [ ] test-target evidence

### C / C++

- [x] broad include extraction baseline
- [ ] CMake target/include boundary rules
- [ ] compile-command evidence
- [ ] generated header/source handling
- [ ] compiler-warning suppression detection beyond generic NOLINT

## Phase 3 — Dependency and architecture truth

- [x] Declared-vs-imported dependency baseline
- [x] Explicit architecture boundary rules
- [x] Installed API/version truth from local package metadata (JavaScript local resolution + installed package metadata baseline)
- [x] Lockfile/manifest consistency (package.json/package-lock root and declared-range baseline)
- [x] Dependency addition review (manifest additions surfaced as WARN evidence)
- [ ] Dependency removal review
- [ ] Duplicate/existing-abstraction detection
- [ ] Package/workspace boundary enforcement
- [ ] Generated-code boundary enforcement

## Phase 4 — Agent trajectory controls

- [x] Validation repetition warning
- [ ] Meaningful-progress detection across repeated edits
- [ ] Failure-loop breaker when actual failure evidence is available
- [ ] Abandoned/speculative change detection
- [ ] Unused new symbol/import detection
- [ ] Temporary workaround detection
- [ ] Revert/churn detection within one session
- [ ] Human escalation signal after repeated non-progress

## Phase 5 — Security and trust boundaries

- [x] Sensitive-file read protection
- [x] Guardrail self-protection
- [x] Destructive shell/Git protection
- [ ] Untrusted repository-content classification
- [ ] Prompt-injection boundary guidance
- [ ] Tool-output trust classification
- [ ] Protected configuration provenance
- [ ] Command indirection/alias normalization
- [ ] Shell-language coverage: PowerShell, cmd, POSIX shells, fish

## Phase 6 — OpenCode V1 capability compatibility

- [x] Core enforcement on tool.execute.before
- [x] Supplementary permission hook
- [x] Optional context transform
- [ ] Capability matrix across selected V1 releases
- [ ] Historical V1 smoke tests
- [ ] Child-session/subagent enforcement verification
- [ ] Graceful degradation tests for missing optional hooks
- [ ] Host-specific regression tracking

## Phase 7 — Quality and maintainability

- [ ] Rule false-positive corpus
- [ ] Cross-language fixture corpus
- [ ] Performance benchmark for hot-path checks
- [ ] Cached manifest/dependency discovery
- [ ] Structured finding codes
- [ ] Stable machine-readable diagnostics
- [ ] Documentation/implementation consistency checks
- [ ] CI matrix for supported Node/OpenCode V1 baselines

## Explicit non-goals

- [ ] No universal semantic-correctness oracle.
- [ ] No automatic architecture inference presented as fact.
- [ ] No network dependency lookup in the write hot path.
- [ ] No rule that blocks legitimate exceptions merely because a suppression exists.
- [ ] No V2 lifecycle API in the V1 plugin.
- [ ] No massive regex catalogue without evidence and tests.

- [x] CI repair: validate parser syntax and suppression-test ownership after GitHub Actions failures.
