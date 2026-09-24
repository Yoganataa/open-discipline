# OpenDiscipline Engineering Policy

OpenDiscipline is a deterministic guardrail for agent-driven development. Keep the implementation small, predictable, and low-noise.

## Session bootstrap

For every new non-trivial session:

1. Use `README.md` as the repository orientation and documentation map.
2. Read `ROADMAP.md` before choosing implementation work. It is the canonical source of project status and order.
3. Before designing or changing a guardrail, workflow control, memory behavior, or architecture, read `RESEARCH.md` and verify the relevant external evidence.
4. For OpenCode V1 runtime/API work, read `COMPATIBILITY.md` and `docs/SMOKE-TEST.md`; do not substitute memory or SDK types for host evidence.
5. Read only the detailed documents relevant to the current task. Do not bulk-load all Markdown into context.
6. Work on the smallest justified unfinished roadmap item unless the user explicitly directs another scope.
7. Before claiming completion, use observed implementation, test, typecheck, runtime, and user-facing evidence as applicable. Update roadmap status only from observed evidence.

Never treat README status, generated memory, agent narration, or a green proxy check as proof when the canonical source or current repository evidence says otherwise.

## Core principles

- Prefer deterministic checks over model-dependent judgments.
- Block only when evidence is strong.
- Warn when context is ambiguous.
- Never hide a failure merely to keep a tool call moving.
- Do not make unrelated refactors while changing a guard.
- Keep OpenCode V1 compatibility explicit; do not add V2 APIs.

## Naming

Internal technical names should describe domain responsibility, not product ownership.

Do not mechanically add a product/company/project prefix:

`AcmeUserRepository` -> `UserRepository`

Branding is allowed at real boundaries such as protocol identifiers, package coordinates, SDK/API names, published integrations, and user-facing identity.

When a collision exists, use the smallest semantic qualifier that explains the distinction.

## Guard design

Every new rule must define:

1. What evidence it examines.
2. Why that evidence is reliable.
3. What constitutes BLOCK versus WARN.
4. Its expected false-positive behavior.
5. An explicit escape hatch for legitimate exceptions.
6. Unit tests for both the violation and the non-violation.

Rules should be independent and registered through the rule registry.

## Workflow discipline

Use `.opencode/skills/open-discipline-workflow/SKILL.md` and `docs/WORKFLOW.md` as the native workflow guidance for non-trivial work.

- Select the smallest justified workflow level; do not create ceremony for trivial edits.
- For L2/L3 work, preserve traceability from requirements to tasks to verification evidence.
- Separate spec-compliance review from code-quality review.
- Do not claim completion or passing validation without observed evidence.
- End-user verification is distinct from unit/integration tests when the change has a user-visible path.
- Workflow guidance is not a substitute for OpenDiscipline enforcement and must never be used to justify bypassing a BLOCK.
- Do not create duplicate roadmaps, duplicate authoritative policy documents, or ad-hoc TODO files when an existing project document owns the information.

## Scope discipline

Avoid broad repository scans in hot hooks.

Prefer:

- changed files;
- added/edited text;
- configured paths;
- cached compiled matchers.

Do not add network requests to the enforcement path.

## Security

Protected files and destructive commands should fail closed only when the configured rule has high confidence.

Do not print secrets or complete sensitive file contents in diagnostics.

## Validation

A change to a rule is not complete until:

- unit tests cover the rule;
- false-positive cases are covered;
- typecheck passes;
- the plugin remains loadable under OpenCode V1;
- documentation matches the actual configuration.

## Compatibility

The supported host target is OpenCode V1. Pin the plugin API dependency to the tested V1 release.

Do not use undocumented V2 lifecycle APIs.

## Change policy

Do not expand the guard surface merely because a pattern is theoretically possible. Add a rule when it materially reduces a recurring agent failure mode without creating disproportionate friction.
