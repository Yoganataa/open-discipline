# OpenCode V1 Compatibility Matrix

This document is the runtime compatibility contract for OpenDiscipline.

The project distinguishes three evidence levels:
- **Type/API**: the plugin SDK exposes the hook shape.
- **Host-source**: the selected OpenCode release source contains the expected hook wiring.
- **Runtime-smoke**: the actual OpenCode binary was executed with the plugin and the hook behavior was observed.

A release is not called fully supported from Type/API evidence alone.

## Selected V1 releases

| OpenCode V1 | Plugin hook API | Host source: tool.execute.before | Host source: child TaskTool enforcement | Runtime smoke |
|---|---|---|---|---|
| 1.18.14 | observed | observed | observed | pending |
| 1.18.30 | observed | observed | observed | pending |
| 1.18.31 | observed | observed | observed | pending |

The three rows were checked against the corresponding upstream release source. The child-session check specifically verifies that the session prompt path triggers the plugin's tool.execute.before hook for TaskTool before executing the subtask.

## Required capability

tool.execute.before is the mandatory enforcement boundary.

The plugin's safety model must not depend on permission.ask, experimental.chat.messages.transform, a particular command exit-code event, or model-generated compliance.

If an optional hook is absent or does not run, the core tool.execute.before enforcement must still be usable.

## Optional capabilities

| Capability | Role | Failure mode if unavailable |
|---|---|---|
| permission.ask | supplementary permission denial | protected read is still enforced at tool.execute.before |
| experimental.chat.messages.transform | policy context and initial task-intent capture | enforcement continues; explicit task intent may be unavailable and scope checks degrade to change-surface evidence |
| event / session.idle | completion-evidence warning and cleanup | enforcement continues; completion warning may be unavailable |
| command.execute.before | duplicate command-boundary coverage and validation tracking | tool-boundary enforcement remains authoritative |

## Child-session enforcement

OpenCode V1's task/subagent path invokes tool.execute.before before TaskTool execution in the selected V1 releases.

OpenDiscipline therefore treats child sessions as separate session state but the same enforcement contract:

parent session -> TaskTool -> child session -> tool.execute.before

The plugin does not assume that the parent session's mutable state is inherited by the child. Each child sessionID receives a fresh state record and the same rule registry.

The repository test suite verifies this contract at the plugin-hook level. It does not claim that this replaces an end-to-end binary smoke test.

## Known historical regression class

OpenCode 1.17.1 had a reported regression in tool.execute.before argument mutation behavior. OpenDiscipline does not rely on mutating tool arguments to enforce safety; enforcement is performed by throwing on high-confidence BLOCK findings and by warning on ambiguous findings.

This historical issue is retained as a regression-tracking reference rather than as evidence that all V1 releases behave identically.

Reference:
https://github.com/anomalyco/opencode/issues/31680

## Runtime smoke requirement

Before marking a historical release fully supported, run the actual OpenCode binary and verify at minimum:

1. plugin loads;
2. tool.execute.before fires;
3. a guarded write is blocked;
4. a warning-only rule emits evidence without blocking;
5. an optional-hook omission does not disable core enforcement;
6. a subtask/child session receives the same guardrail.

The result must record the exact OpenCode version, platform, test fixture, and observed result.

## Compatibility policy

OpenDiscipline is V1-only.

@opencode-ai/plugin 1.18.30 remains the repository's type/development baseline. Runtime support claims are based on host evidence, not semver assumptions.

A new V1 release should not be marked supported automatically. Add a matrix row and run the required smoke fixture before changing the support statement.