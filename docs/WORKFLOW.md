# OpenDiscipline Workflow v1

OpenDiscipline adopts proven agentic software-development patterns without depending on a third-party methodology.

The workflow layer is instruction/skill driven. The guardrail kernel remains responsible for deterministic BLOCK/WARN enforcement. A workflow instruction must never be treated as proof that a task is safe or complete.

## Evidence basis

The workflow combines recurring patterns documented by:

- Superpowers: brainstorm/design approval, implementation planning, task-scoped execution, review, and verification.
- Kiro Specs: requirements with acceptance criteria, design, then tasks.
- Antigravity: task list, implementation plan, implementation evidence, and walkthrough artifacts.
- Claude Code: repository exploration, planning, implementation, and verification.
- Codex: repository instructions, persistent execution, tool-driven implementation, and verification rather than relying on narration.

These sources support workflow components, not a claim that any product's complete workflow is objectively superior.

Independent research also motivates explicit verification and evidence. OpenDiscipline's research record cites evidence on insecure agent actions, malicious task/repository instructions, dependency risk, broader repository-task difficulty, and the value of execution feedback. See RESEARCH.md.

## Core lifecycle

    Intent
      -> Requirements / bug behavior
      -> Design (when needed)
      -> Implementation Plan
      -> Tasks
      -> Implement
      -> Verify
      -> Spec-compliance review
      -> Code-quality review
      -> End-user verification
      -> Walkthrough / handoff

The lifecycle is adaptive. Trivial changes must not create unnecessary documentation.

## Workflow levels

### L0 — Trivial

Use for typo fixes, isolated documentation edits, formatting, or similarly bounded changes.

Required:
- understand request;
- make change;
- run an appropriate lightweight check when one exists.

No formal workflow artifact is required.

### L1 — Small change

Use for a bounded bugfix, small refactor, or small behavior change with low architectural risk.

Required:
- concise intent;
- implementation task;
- relevant validation;
- completion evidence.

A short task artifact may be used when the work spans multiple tool operations.

### L2 — Feature

Use when the change introduces user-visible behavior, multiple implementation steps, or meaningful integration risk.

Required artifacts:
- intent.md;
- requirements.md with acceptance criteria;
- plan.md;
- tasks.md;
- verification.md;
- walkthrough.md when the feature is complete.

Use design.md when architecture, data flow, interfaces, persistence, security boundaries, or failure handling require explicit decisions.

### L3 — Architectural / high-risk

Use for migrations, security-sensitive changes, major architecture changes, cross-package changes, or changes with substantial external/user impact.

Required artifacts:
- intent.md;
- requirements.md;
- design.md;
- plan.md;
- tasks.md;
- per-task verification;
- spec-compliance review;
- code-quality review;
- end-user verification where applicable;
- walkthrough.md.

A human decision gate may be required by the project. The workflow does not invent approval requirements that are not configured or requested.

## Artifact contracts

### intent.md

Answers: what outcome does the user actually want?

Must distinguish user outcome from implementation preference. Do not invent requirements.

### requirements.md

Answers: what must be true when the work is complete?

Each requirement should have observable acceptance criteria.

Example:

    ## R1 — Login

    When a user submits valid credentials, the application creates an authenticated session.

    Acceptance:
    - valid credentials create a session;
    - invalid credentials are rejected;
    - the session can be cleared.

### design.md

Answers: how will requirements be implemented?

Include only decisions that materially affect implementation:
- architecture;
- interfaces/data flow;
- persistence;
- failure handling;
- security/trust boundaries;
- validation strategy.

### plan.md

Answers: what implementation sequence will produce the required behavior?

Each phase should identify affected files/components, dependencies, validation, and material risks.

### tasks.md

Answers: what independently executable units remain?

Each task should be small enough to verify independently and should reference the requirement(s) it satisfies.

Recommended form:

    - [ ] AUTH-03 — Add password hashing service
      - Requirements: R2
      - Files: src/auth/password.ts, tests/auth/password.test.ts
      - Depends on: AUTH-01
      - Verification: npm test -- password

### verification.md

Records observed evidence, not intentions.

Separate:
- unit/integration tests;
- typecheck/lint/build;
- runtime checks;
- end-user checks.

Never write "passed" without observed evidence.

### walkthrough.md

Final handoff artifact.

It should answer:
- what changed;
- why it changed;
- how it was verified;
- what user-visible behavior was checked;
- known limitations or follow-up work.

For UI work, screenshots or recordings may be referenced when available. A walkthrough is evidence packaging, not a substitute for testing.

## Task completion

A task is complete only when:
1. its implementation is present;
2. its referenced acceptance criteria are addressed;
3. relevant validation was actually attempted;
4. observed validation evidence is recorded;
5. review findings are resolved or explicitly documented.

OpenDiscipline must not infer semantic correctness from the existence of an artifact.

## Review model

Use two distinct questions:

1. Spec compliance: does the implementation satisfy the stated requirements and acceptance criteria?
2. Code quality: is the implementation maintainable, consistent with project architecture, and free of avoidable defects?

A clean code review does not prove requirements are satisfied, and passing tests does not prove the implementation matches the requested product behavior.

## Scope rule

The workflow should use explicit scope when the user provides it, but must not invent file scope from vague natural language.

If scope is unclear:
- explore the repository;
- state the inferred implementation surface in the plan;
- keep OpenDiscipline's change-surface and scope evidence active.

## Anti-patterns

Do not:
- create formal specs for trivial edits;
- use planning text as a substitute for execution;
- mark tasks complete because the agent believes they are complete;
- claim tests passed without observing the result;
- weaken tests to make the suite green;
- bypass OpenDiscipline findings;
- turn every workflow practice into a BLOCK rule;
- add network calls to the guardrail hot path.

## Relationship to OpenDiscipline enforcement

    Workflow instruction
        |
        v
    agent action
        |
        v
    OpenDiscipline tool boundary
        |---- BLOCK high-confidence invariant violation
        |---- WARN ambiguous evidence
        |---- record/require evidence where supported
        v
    tool execution

The workflow layer improves process. The enforcement layer protects invariants.
