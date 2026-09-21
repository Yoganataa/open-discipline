# open-disipline

A focused OpenCode V1 engineering-discipline plugin. It combines low-noise policy context with deterministic tool-boundary guardrails.

The project is intentionally conservative: it prefers a useful warning over speculative blocking, and a small reliable rule over a large heuristic system.

## Guardrails

| Rule | Purpose | Default |
|---|---|---|
| `naming` | Reject unnecessary product/company/project prefixes in internal identifiers | block/warn |
| `slop:empty-catch` | Detect swallowed exceptions | block |
| `slop:secret` | Detect common credential-shaped material | block in code, warn elsewhere |
| `slop:debug-residue` | Detect common debug leftovers | warn |
| `slop:type-ignore` | Detect common type-error suppression | warn |
| `slop:todo` | Detect TODO/FIXME/HACK markers added to code | warn |
| `protected-files` | Protect explicitly configured paths | block |
| `test-integrity` | Detect skip/only/disabled test changes | warn |
| `change-surface` | Keep a single tool operation from exploding into a large file set | warn/block |
| command guards | Optional repository-specific command regexes | opt-in |
| protected reads | Deny reads of `.env`-style files through OpenCode permission requests | enabled |

## Design

OpenDisipline has two separate paths:

1. Context guidance: a short policy is injected into the first user message and is idempotent, so it is not repeatedly appended on every model step.
2. Enforcement: `tool.execute.before`, `command.execute.before`, and `permission.ask` perform deterministic checks before consequential operations.

The enforcement path is deliberately local and offline.

## OpenCode V1

The plugin targets OpenCode V1 and is tested against the V1 plugin API package `1.18.30`.
Do not replace the pinned plugin dependency with `latest`.

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
  "changeSurface": {
    "warnAt": 25,
    "blockAt": 100
  }
}
```

Use `advisory` mode during rollout when you want diagnostics without blocking writes.

## Why the plugin is conservative

Agentic coding failures are often caused by overreach rather than syntax errors: unnecessary refactors, weakened tests, secret leakage, debug residue, unsafe reads, and changes that become much larger than the original task.

OpenDisipline does not try to judge the entire design of a change. It enforces small, observable invariants at the tool boundary and leaves deeper semantic review to the agent, tests, linters, code review, and repository-specific tooling.

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
- how legitimate exceptions are configured.