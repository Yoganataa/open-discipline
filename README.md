# open-discipline

A focused OpenCode V1 engineering-discipline plugin. It combines low-noise policy context with deterministic tool-boundary guardrails.

The project is intentionally conservative: it prefers a useful warning over speculative blocking, and a small reliable rule over a large heuristic system.

## What it is designed to stop

Agentic coding failures are often not syntax failures. The recurring problems are scope drift, test gaming, swallowed errors, secret leakage, unsafe reads, speculative refactors, repeated failed attempts, and declaring a task complete without sufficient evidence.

OpenDiscipline treats these as engineering-control problems. It does not attempt to judge whether an entire implementation is semantically correct with regexes. Instead, it blocks or warns on observable evidence and requires stronger evidence as the project matures.

## Guardrails

| Rule | Purpose | Default |
|---|---|---|
| `naming` | Reject unnecessary product/company/project prefixes in internal identifiers | block/warn |
| `slop:empty-catch` | Detect swallowed exceptions | block |
| `slop:secret` | Detect common credential-shaped material | block in code, warn elsewhere |
| `slop:debug-residue` | Detect common debug leftovers | warn |
| `suppression` | Detect type-checker/linter/analyzer suppression across major language stacks | warn/block |
| `slop:todo` | Detect TODO/FIXME/HACK markers added to code | warn |
| `protected-files` | Protect explicitly configured paths | block |
| `test-integrity` | Detect disabled, vacuous, deleted, or weakened test oracles | warn |
| `test-evidence` | Flag behavior/code changes with no test-file change | warn |
| `change-surface` | Keep a single tool operation from exploding into a large guarded file set | warn/block |
| `dependency-truth` | Detect external imports that are not declared in the detected project manifest | warn |
| `architecture` | Enforce explicit import boundaries configured per project | block/warn |
| command guards | Optional repository-specific command regexes | opt-in |
| protected reads | Protect `.env`-style reads at the tool boundary | enabled |
| guardrail integrity | Prevent agent writes to the plugin's own rules/configuration | enabled |

## Design

OpenDiscipline has three complementary layers:

1. Workflow guidance: native OpenCode skills teach the agent how to structure work without requiring a third-party methodology plugin.
2. Context guidance: a short policy is injected into the first user message and is idempotent.
3. Enforcement: deterministic checks run before consequential tool operations.

The workflow layer is intentionally separate from enforcement. A workflow instruction can recommend a plan, task list, review, or walkthrough, but it cannot prove that an operation is safe. The enforcement layer remains authoritative at the tool boundary.

See `docs/WORKFLOW.md` for Workflow v1 and `.opencode/skills/open-discipline-workflow/SKILL.md` for the native OpenCode skill.

OpenCode host compatibility is validated separately from PR CI. Run the local smoke procedure in `docs/SMOKE-TEST.md` against the OpenCode installation you actually use, then send the generated report artifacts when runtime evidence is needed.

The enforcement path is local and offline. It does not send source code, prompts, secrets, or telemetry to an external service.

The important design rule is:

> Instructions tell the agent what should happen. Tool-boundary enforcement controls what the agent is allowed to do.

## Anti-bypass model

OpenDiscipline does not treat an agent's proposed workaround as a valid fix.

When a guard rejects a change, the intended response is to change the implementation so the evidence that triggered the guard disappears for a legitimate reason.

The plugin also protects its own core implementation/configuration paths from normal agent write/edit/apply-patch operations:

- `discipline.config.json`
- `src/index.ts`
- `src/config.ts`
- `src/core/**`
- `src/rules/**`
- `src/scanners/**`
- `.opencode/plugins/open-discipline.ts`

This is deliberately stronger than asking the model not to modify the guard.

This does not claim to be a perfect security boundary against every possible shell, host, subagent, or OpenCode implementation bypass. OpenCode hook behavior remains part of the trust boundary.

## Fix correctly, not merely make the test green

A green test suite is not treated as sufficient evidence by itself.

The integrity layer detects several common ways an agent can manufacture green tests:

- `.skip()`, `.only()`, `xit`, `xdescribe`, `@Ignore`, `@Disabled`, and similar test suppression;
- vacuous assertions such as asserting `true`;
- removal of existing assertion/oracle lines from patches;
- deletion of test files;
- code changes with no corresponding test-file change.

The last item is a warning rather than an automatic failure because some legitimate implementation changes do not require new tests. The intended workflow is:

```text
failure
  -> identify behavior
  -> change implementation
  -> add/update regression coverage
  -> run relevant validation
  -> inspect scope
  -> complete only with evidence
```

OpenDiscipline cannot prove semantic correctness from source text alone. It deliberately reports this boundary instead of pretending that a regex can prove a bug is fixed.

## Agentic failure roadmap

This roadmap is part of the project. A feature is considered useful only when it reduces a recurring failure mode without creating disproportionate false positives.

### Implemented

- [x] Domain-first naming / anti-brand-slop
- [x] Empty exception handling detection
- [x] Credential-shaped secret detection
- [x] Debug residue detection
- [x] Cross-language suppression detection (TypeScript, Python, Kotlin/Java/Android, Go, Rust, C#/.NET, Dart, C/C++ and common linter directives)
- [x] TODO/FIXME/HACK detection
- [x] Protected file writes
- [x] Protected `.env` reads at the tool boundary
- [x] Test skip/focus detection
- [x] Vacuous assertion detection
- [x] Removed-test-oracle detection from patches
- [x] Test-file deletion warning
- [x] Regression-evidence warning for code changes without test changes
- [x] Change-surface guard
- [x] Guardrail self-protection
- [x] Idempotent policy context
- [x] Global + project configuration merging
- [x] Command guard precompilation

### Next priority

The universal rule contract is now enforced by the rule registry. Every rule declares observable evidence, a legitimate-exception model, bypass analysis, and positive/negative/exception test requirements. Findings without observable evidence are suppressed and surfaced as a contract warning instead of being treated as reliable enforcement evidence.


- [x] Completion-evidence warning: detect code changes that reach session idle without a validation command.
- [x] Validation-repetition warning: detect repeated identical validation attempts; V1 does not expose a portable command exit code through `command.executed`, so this deliberately does not claim to prove failure.
- [x] Dependency API/version truth: verify JavaScript imports against local installed metadata/resolution and package-lock manifest truth without network access.
- [x] Dependency-change guard: flag newly introduced manifest dependencies for explicit necessity/API review.
- [x] Scope/intent ledger: compare explicitly declared task paths with the actual changed surface; when no explicit path evidence exists, retain change-surface evidence instead of inferring intent.
- [x] Session-local regression evidence ordering: warn when code changes occur before observable regression-test evidence; failure-to-fix linkage remains pending because OpenCode V1 does not expose a portable command exit status.
- [x] Safer shell/destructive-command guard: block destructive Git/reset/force-push/bulk-delete operations and protect guardrail paths.
- [x] Dependency-truth baseline: detect undeclared external imports for supported manifests.
- [x] Configurable architecture boundaries: block explicitly denied imports in configured source layers.
- [x] Plugin-boundary subagent enforcement verification: child sessions receive the same core `tool.execute.before` guardrails with isolated state.
- [x] Source-verified compatibility matrix for OpenCode V1 1.18.14, 1.18.30, and 1.18.31; actual binary smoke remains pending.
- [x] Workflow v1 specification: adaptive L0-L3 workflow with intent, requirements, design, plan, tasks, verification, review, and walkthrough contracts.
- [x] Native OpenCode workflow skill: select the smallest justified workflow level and enforce evidence-oriented completion guidance.

### Dependency truth is local-only

The dependency evidence layer is deliberately offline. JavaScript dependencies use the local `package.json`, `package-lock.json`, Node module resolution, and installed package metadata when available. A declared dependency whose requested import cannot be resolved locally produces a warning rather than an invented API/version claim. New dependency declarations are also surfaced for review; the plugin does not decide that a package is unnecessary merely from source text.

### Deliberately not planned

- [ ] Full semantic code correctness through regexes.
- [ ] Autonomous architecture judgement.
- [ ] Blocking every TODO or every refactor.
- [ ] Network-based source analysis in the enforcement hot path.
- [ ] V2 lifecycle APIs in the V1 plugin.
- [ ] A giant collection of heuristic rules with unclear false-positive behavior.

## Agentic workflow

OpenDiscipline does not require Superpowers, Kiro, Antigravity, or another third-party workflow package. It adopts selected workflow patterns as native project guidance.

The workflow is adaptive:

- L0: trivial change, no formal artifact required.
- L1: small bounded change, concise intent/task plus validation.
- L2: feature work, requirements + acceptance criteria, plan, tasks, verification, and walkthrough; design when material decisions exist.
- L3: architectural/high-risk work, explicit design, per-task verification, two-stage review, and end-user verification where applicable.

The lifecycle is:

`intent -> requirements -> design (when needed) -> implementation plan -> tasks -> implement -> verify -> spec review -> code review -> end-user verification -> walkthrough`

The design intentionally combines patterns documented by Superpowers, Kiro Specs, Antigravity, Claude Code, and Codex. These references support individual workflow components; OpenDiscipline does not claim that any one product's workflow is universally optimal.

The evidence basis and limitations are recorded in `RESEARCH.md` and `docs/WORKFLOW.md`.

## Runtime safety and evidence

Completion evidence is intentionally conservative. OpenDiscipline observes validation commands and warns when code changes reach `session.idle` without a detected validation attempt. It does not claim that a command passed when the V1 event schema does not expose a portable exit code.

The command guard blocks destructive Git operations, force-pushes, dangerous recursive deletion, bulk deletion, and shell writes targeting protected guardrail paths. Custom `commandGuards` remain available for repository-specific commands.

Validation detection covers common ecosystems including npm/pnpm/yarn/bun, pytest/mypy/pyright/ruff, Go, Cargo, .NET, Gradle/Maven, Flutter/Dart, Swift/Xcode, and CMake/CTest.

## OpenCode V1 compatibility

The runtime design is capability-oriented, not intended to be locked to one exact V1 patch release.

`@opencode-ai/plugin@1.18.30` is the development/typecheck baseline currently used by this repository. It is not intended to mean that the runtime requires exactly 1.18.30.

Core enforcement relies on the V1 `tool.execute.before` boundary. Optional hooks such as context transformation and permission handling are supplementary; the plugin should remain useful if an optional hook is unavailable or behaves differently in a particular V1 host.

The project is V1-only. Do not add V2 lifecycle APIs.

The latest-stable smoke workflow is intended to verify the actual released V1 binary rather than treating SDK types or host-source inspection as runtime proof. Historical releases remain useful as regression references, not as the primary daily compatibility target.

See `ROADMAP.md` for implementation status and `COMPATIBILITY.md` for the evidence-level compatibility matrix. The selected V1 releases have source-level evidence for the core hook and child TaskTool enforcement. Actual binary smoke is intentionally still marked pending; SDK types and host source are not treated as runtime proof.

## Configuration

Project configuration lives in `discipline.config.json`. A global configuration can be placed at `~/.config/opencode/discipline.config.json`.

Project configuration is merged over global configuration, including nested sections.

The naming rule can automatically derive a brand from `package.json`. Generic project names such as `app`, `server`, `project`, and `web` are ignored to avoid accidental false positives.

Example:

```json
{
  "mode": "strict",
  "brands": ["Acme"],
  "autoBrands": true,
  "protectedPaths": ["src/generated/**"],
  "testEvidence": {
    "enabled": true,
    "severity": "warn"
  },
  "changeSurface": {
    "warnAt": 25,
    "blockAt": 100
  }
}
```

Use `advisory` mode during rollout when you want diagnostics without blocking writes. Note that guardrail integrity paths remain protected because disabling the policy from inside the guarded project would defeat the purpose of the integrity layer.

## Why the plugin is conservative

False positives destroy trust in a guardrail. OpenDiscipline therefore prefers:

- BLOCK when the evidence is strong and the operation is clearly unsafe;
- WARN when context is ambiguous;
- explicit configuration for legitimate exceptions;
- small local checks instead of broad repository analysis;
- evidence-based completion instead of claims of correctness.

## Development

```sh
npm install
npm test
npm run typecheck
```

The runtime plugin has no network service and no telemetry requirement.

## Adding a rule

Add a `DisciplineRule` under `src/rules/`, keep it deterministic, register it in `src/index.ts`, and add both positive and negative tests.

A new rule should explain:

- evidence it examines;
- why that evidence is reliable;
- BLOCK versus WARN semantics;
- false-positive expectations;
- how legitimate exceptions are configured;
- how an agent could otherwise bypass it;
- what evidence demonstrates that the rule itself works.

### Architecture configuration

Architecture enforcement is intentionally opt-in by rule. An empty rule list does nothing, so enabling the subsystem does not impose a framework on an unknown repository.

Example:

```json
{
  "architecture": {
    "enabled": true,
    "rules": [
      { "from": "src/ui/**", "denyImports": ["src/database/**", "@/database/**"] }
    ]
  }
}
```

This is an explicit boundary, not an attempt to infer the project's architecture.

### Dependency truth

The dependency rule compares imports in changed files with locally detected manifests such as `package.json`, Python requirement files, `go.mod`, `Cargo.toml`, and `pubspec.yaml`. It is a warning by default because import-to-package mappings and monorepo/workspace layouts can be ambiguous.

It does not install packages, query a registry, or send source code to a service. It does not claim that an undeclared import is definitely nonexistent; it says the repository's dependency declaration does not currently prove that the dependency is declared.