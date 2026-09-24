---
name: open-discipline-workflow
description: Select and execute the appropriate OpenDiscipline engineering workflow for a software task. Use for feature work, bug fixes, refactors, migrations, and other repository changes; skip formal artifacts for genuinely trivial edits.
---

# OpenDiscipline Workflow

Use this skill to apply the repository's workflow discipline without turning every change into a ceremony.

Read docs/WORKFLOW.md before selecting a workflow level when it is available.

## 1. Classify the task

Choose the smallest justified level:

- L0: trivial documentation/formatting/isolated typo.
- L1: small bounded bugfix, refactor, or behavior change.
- L2: user-visible feature, multi-step change, or meaningful integration risk.
- L3: architecture/security/migration/high-risk change.

Do not inflate the level merely to produce more artifacts.

## 2. Establish intent

State the user-visible outcome. Do not invent requirements.

If the request is ambiguous, inspect the repository and identify the minimum clarification needed rather than silently choosing a product behavior.

## 3. Establish requirements

For L2/L3 work, write requirements with observable acceptance criteria.

For a bugfix, describe the observed incorrect behavior and the corrected behavior. A regression test should target the behavior when practical.

## 4. Design when decisions matter

For L2/L3 work, create design.md when architecture, data flow, persistence, interfaces, failure handling, security boundaries, or integration decisions materially affect the implementation.

Do not write a design essay for a local change.

## 5. Plan and decompose

Create plan.md and tasks.md.

Every meaningful task should identify:
- requirement(s) satisfied;
- files/components likely to change;
- dependencies;
- verification method.

Plans are artifacts for execution and review. Do not spend the user's time narrating obvious next steps.

## 6. Implement

Work one bounded task at a time when practical.

Respect repository instructions and OpenDiscipline guardrails. Do not modify guardrail implementation/configuration merely to bypass a finding.

Prefer the smallest coherent change that satisfies the requirement.

## 7. Verify continuously

After meaningful changes, run the narrowest relevant validation first, then broader validation as appropriate.

Record observed evidence in verification.md.

Never report a validation command as passing unless its result was actually observed.

## 8. Review twice

Perform:

### Spec-compliance review
Check every requirement and acceptance criterion.

### Code-quality review
Check architecture, error handling, maintainability, tests, and unnecessary complexity.

Resolve findings before declaring completion, or explicitly record an unresolved limitation.

## 9. Verify from the user's perspective

For user-visible work, exercise the actual user path when the environment permits it.

Examples:
- CLI: run the command as a user would.
- API: exercise the relevant endpoint.
- Web UI: execute the user flow.
- Mobile: execute the affected interaction.
- Library: validate the documented public API.

Unit tests alone are not end-user verification.

## 10. Produce the walkthrough

For L2/L3 work, complete walkthrough.md.

Include:
- summary of changes;
- requirements satisfied;
- verification evidence;
- user-visible verification;
- limitations/follow-ups.

A walkthrough is a handoff/evidence artifact, not permission to claim success without evidence.

## 11. Completion test

Before declaring the task complete, ask:

- Did I implement the requested behavior?
- Did I satisfy every acceptance criterion?
- Did I run the relevant validation?
- Did I inspect the actual result?
- Did I review both specification compliance and code quality?
- Did I verify the user-visible path where applicable?
- Did I leave a useful walkthrough for L2/L3 work?

If any answer is no, do not claim the task is complete.
