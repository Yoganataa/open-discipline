# OpenDiscipline Research Basis

OpenDiscipline is designed as an engineering-control response to recurring failure modes observed in autonomous and agentic coding systems.

This document records external research that materially informs the roadmap. It is not a claim that every study proves a specific OpenDiscipline rule. Each study is mapped only to the failure mode and control boundary that the evidence supports.

## Core design principle

The research points toward a consistent engineering pattern:

research finding -> observable failure mode -> deterministic evidence -> WARN/BLOCK according to certainty -> legitimate-exception path -> positive/negative/exception tests -> CI validation

OpenDiscipline deliberately does not attempt to prove semantic correctness from source text alone.

## Research findings

### 1. Unsafe actions occur during normal coding-agent operation

Kozak, Zilouchian Moghaddam, and Sivaraman (2025) evaluated more than 12,000 agent actions across 93 real-world software setup tasks and reported that 21% of agent trajectories contained insecure actions. Information exposure (CWE-200) was the most prevalent vulnerability category in their detection system.

Source: https://arxiv.org/abs/2507.09329

OpenDiscipline response:

| Failure mode | Control |
|---|---|
| Sensitive files or data exposed through normal agent actions | Protected sensitive-file reads |
| Unsafe implementation artifacts | Secret-shaped credential detection |
| Unsafe shell mutation | Destructive Git/shell guard |
| Agent behavior cannot be trusted solely from instructions | Tool-boundary enforcement |

Limit: The study does not prove that these exact rules cover every insecure behavior. The plugin therefore treats these controls as narrow evidence checks, not a complete security oracle.

### 2. Tool-using coding agents remain vulnerable to malicious task/repository instructions

IssueTrojanBench (2026) evaluates malicious issue requests against modern coding agents and reports that 66.5% of the malicious issues in its benchmark penetrated the evaluated agent/LLM guardrails. The paper also reports that rejection behavior was primarily attributable to the LLM rather than the agent framework.

Source: https://arxiv.org/abs/2607.20759

OpenDiscipline response:

| Failure mode | Control / roadmap |
|---|---|
| Instructions embedded in untrusted repository/task content influence agent behavior | Untrusted repository-content classification — Phase 5 |
| Prompt-injection boundary is treated as trusted context | Prompt-injection boundary guidance — Phase 5 |
| Tool outputs become implicit instructions | Tool-output trust classification — Phase 5 |
| Guardrails exist only as model instructions | Tool-boundary enforcement already implemented |

Limit: OpenDiscipline cannot make untrusted text trustworthy merely by labeling it. This research supports a trust-boundary architecture, not a claim that regex filtering solves prompt injection.

### 3. Agent-authored dependency changes can increase supply-chain risk

Singla et al. (2026) studied 117,062 dependency changes across seven ecosystems. Their study reports vulnerable-version selection rates of 2.46% for agent-authored changes versus 1.64% for human-authored work. The paper reports a net vulnerability increase of 98 for agent-driven dependency work in its dataset, compared with a net reduction of 1,316 for human-authored work.

Source: https://arxiv.org/abs/2601.00205

OpenDiscipline response:

| Failure mode | Control |
|---|---|
| New dependency introduced without explicit scrutiny | Dependency-change warning |
| Imported package absent from manifest | Dependency-truth baseline |
| Invented/unsupported package API | Local installed API/version truth |
| Manifest and lockfile disagreement | Lockfile consistency baseline |

Limit: The current implementation is intentionally offline. It does not query vulnerability registries and therefore cannot claim that a package/version is secure. Registry-aware vulnerability screening remains outside the current hot path.

### 4. Real-world repository task distributions can be substantially harder than benchmark distributions

Vergopoulos, Müller, and Vechev (2025) introduced broader repository-level coding benchmarks and reported distributional differences from SWE-Bench. In their experiments, agent success rates were reported to be up to 40% lower on the broader datasets.

Source: https://arxiv.org/abs/2503.07701

OpenDiscipline response:

| Failure mode | Control |
|---|---|
| Agent optimizes for the apparent task while expanding scope | Scope/intent ledger |
| Large speculative edits hide task drift | Change-surface guard |
| Project structure is assumed rather than observed | Explicit architecture boundaries |
| One benchmark-style test result is treated as proof | Completion and test-integrity evidence |

Limit: A benchmark gap does not imply that every agent action is a failure. It supports requiring repository-specific evidence instead of relying on benchmark-like assumptions.

### 5. Feedback from execution materially improves automated repair

Kulsum et al. (2024) evaluated automated vulnerability repair and reported that a baseline generated plausible patches at 29.6% on average. Their VRpilot approach improved results using reasoning plus external feedback; the paper reports that disabling feedback reduced plausible-patch performance from 64% to 34% in one ablation.

Source: https://arxiv.org/abs/2405.15690

OpenDiscipline response:

| Failure mode | Control |
|---|---|
| Agent repeatedly edits without incorporating failure evidence | Validation-repetition warning |
| Code is changed without regression evidence | Test-evidence warning |
| Failure is fixed syntactically but root cause is not demonstrated | Root-cause/fix evidence — Phase 1 |
| Completion is declared without validation attempt | Completion-evidence warning |

Limit: The paper concerns vulnerability repair, not OpenCode plugins. The relevant lesson is evidence flow: execution feedback should influence the repair loop rather than being ignored.


## 6. Workflow structure and evidence packaging

Product documentation from several agentic coding systems converges on a similar set of process controls, although the documentation is not independent evidence that one product workflow is superior.

- Superpowers documents a software-development methodology built around brainstorming/design, implementation planning, task execution, review, and verification.
  Source: https://github.com/obra/superpowers
- Kiro Specs documents a requirements -> design -> tasks flow, with requirements and acceptance criteria treated as explicit artifacts.
  Source: https://kiro.dev/docs/specs/
- Antigravity documents task lists, implementation plans, and walkthrough artifacts as part of its agent workflow.
  Source: https://antigravity.google/docs/walkthrough
- Claude Code documents repository exploration, planning, implementation, and verification workflows.
  Source: https://docs.anthropic.com/en/docs/claude-code
- OpenAI Codex documentation emphasizes repository instructions, persistent execution, tool use, and verification rather than treating conversational narration as the primary evidence.
  Source: https://developers.openai.com/codex/

OpenDiscipline response:

| Observed workflow pattern | OpenDiscipline control |
|---|---|
| Explicit user outcome before implementation | Workflow L1-L3 intent artifact |
| Acceptance criteria | requirements.md |
| Architecture/data-flow decisions before complex implementation | design.md |
| Executable implementation sequence | plan.md |
| Small independently verifiable units | tasks.md |
| Execution evidence | verification.md |
| Separate requirements and code-quality review | two-stage review guidance |
| User-visible completion evidence | end-user verification + walkthrough.md |
| Avoid unnecessary ceremony on trivial work | adaptive L0-L3 workflow |

Limit: These are primarily product/documentation sources, not controlled comparative experiments. They justify adopting workflow patterns, not a claim that the complete workflow of any named product produces a superior outcome.

The workflow layer therefore remains instruction/skill driven. It does not become a hard BLOCK rule merely because a workflow artifact is missing.

## Research-to-roadmap traceability

| Research-derived failure mode | OpenDiscipline control | Status |
|---|---|---|
| Unsafe tool actions | Tool-boundary enforcement | Implemented |
| Sensitive information exposure | Protected reads / secret detection | Implemented |
| Destructive repository mutation | Shell/Git guard | Implemented |
| Test weakening / manufactured green | Test-integrity rules | Implemented |
| Code changes without validation evidence | Completion-evidence warning | Implemented |
| Repeated same validation attempt | Validation-repetition warning | Implemented |
| Undeclared or locally unsupported dependencies | Dependency truth | Implemented |
| Unreviewed dependency introduction | Dependency-change guard | Implemented |
| Explicit task scope vs actual scope | Scope/intent ledger | Implemented |
| Root-cause linked to regression evidence | Session-local regression evidence ordering | Partial — explicit failure-to-fix linkage remains roadmap because the current V1 boundary does not expose portable command exit status |
| Workflow drift / weak completion evidence | Native L0-L3 workflow + requirements/tasks/verification/walkthrough artifacts | Implemented as guidance; machine task-state enforcement remains roadmap |
| Malicious repository/task instructions | Untrusted-content / prompt-injection boundary | Roadmap |
| Child-agent consistency | Plugin-boundary child-session enforcement + V1 host-source verification | Partial — runtime child-session smoke remains roadmap |
| Historical runtime differences | V1 compatibility matrix | Roadmap |

## How research changes implementation discipline

A research result does not directly become a regex.

For every new control, OpenDiscipline requires:

1. a documented failure mode;
2. an observable evidence definition;
3. a chosen severity based on evidence strength;
4. a legitimate-exception model;
5. an explicit bypass analysis;
6. positive, negative, and exception tests;
7. CI validation;
8. documentation linking the control back to its source.

The project should therefore be evaluated on two axes:

- Does the agentic failure mode exist in evidence?
- Does the guardrail reduce the failure mode without creating disproportionate false positives?

A control that cannot answer both questions should remain experimental or warning-only.

## Non-claims

The research does not establish that OpenDiscipline:

- proves semantic correctness;
- prevents every prompt injection;
- detects every insecure agent action;
- proves a dependency version is vulnerability-free;
- guarantees that a green test suite means the requested behavior is correct;
- guarantees that a blocked operation could not be reproduced through an unmodeled OpenCode or host bypass.

Those limitations are part of the design contract rather than defects to hide.


## OpenCode V1 host evidence

The OpenCode V1 host-source review adds an important distinction to the research-derived roadmap: a guardrail can be correctly implemented at the plugin boundary while still requiring host-level verification.

For V1 1.18.14, 1.18.30, and 1.18.31, the upstream host source was checked for the `tool.execute.before` boundary and for the TaskTool/subtask path invoking that boundary. OpenDiscipline records these as host-source evidence, not runtime-smoke proof.

The project therefore does not convert the source inspection into a claim that every platform and binary build behaves identically. Actual binary smoke tests remain a separate roadmap item.
