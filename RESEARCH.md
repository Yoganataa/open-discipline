# OpenDisipline Research Basis

OpenDisipline is designed as an engineering-control response to recurring failure modes observed in autonomous and agentic coding systems.

This document records external research that materially informs the roadmap. It is not a claim that every study proves a specific OpenDisipline rule. Each study is mapped only to the failure mode and control boundary that the evidence supports.

## Core design principle

The research points toward a consistent engineering pattern:

research finding -> observable failure mode -> deterministic evidence -> WARN/BLOCK according to certainty -> legitimate-exception path -> positive/negative/exception tests -> CI validation

OpenDisipline deliberately does not attempt to prove semantic correctness from source text alone.

## Research findings

### 1. Unsafe actions occur during normal coding-agent operation

Kozak, Zilouchian Moghaddam, and Sivaraman (2025) evaluated more than 12,000 agent actions across 93 real-world software setup tasks and reported that 21% of agent trajectories contained insecure actions. Information exposure (CWE-200) was the most prevalent vulnerability category in their detection system.

Source: https://arxiv.org/abs/2507.09329

OpenDisipline response:

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

OpenDisipline response:

| Failure mode | Control / roadmap |
|---|---|
| Instructions embedded in untrusted repository/task content influence agent behavior | Untrusted repository-content classification — Phase 5 |
| Prompt-injection boundary is treated as trusted context | Prompt-injection boundary guidance — Phase 5 |
| Tool outputs become implicit instructions | Tool-output trust classification — Phase 5 |
| Guardrails exist only as model instructions | Tool-boundary enforcement already implemented |

Limit: OpenDisipline cannot make untrusted text trustworthy merely by labeling it. This research supports a trust-boundary architecture, not a claim that regex filtering solves prompt injection.

### 3. Agent-authored dependency changes can increase supply-chain risk

Singla et al. (2026) studied 117,062 dependency changes across seven ecosystems. Their study reports vulnerable-version selection rates of 2.46% for agent-authored changes versus 1.64% for human-authored work. The paper reports a net vulnerability increase of 98 for agent-driven dependency work in its dataset, compared with a net reduction of 1,316 for human-authored work.

Source: https://arxiv.org/abs/2601.00205

OpenDisipline response:

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

OpenDisipline response:

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

OpenDisipline response:

| Failure mode | Control |
|---|---|
| Agent repeatedly edits without incorporating failure evidence | Validation-repetition warning |
| Code is changed without regression evidence | Test-evidence warning |
| Failure is fixed syntactically but root cause is not demonstrated | Root-cause/fix evidence — Phase 1 |
| Completion is declared without validation attempt | Completion-evidence warning |

Limit: The paper concerns vulnerability repair, not OpenCode plugins. The relevant lesson is evidence flow: execution feedback should influence the repair loop rather than being ignored.

## Research-to-roadmap traceability

| Research-derived failure mode | OpenDisipline control | Status |
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
| Root-cause linked to regression evidence | Root-cause/fix evidence | Roadmap |
| Malicious repository/task instructions | Untrusted-content / prompt-injection boundary | Roadmap |
| Child-agent consistency | Subagent enforcement verification | Roadmap |
| Historical runtime differences | V1 compatibility matrix | Roadmap |

## How research changes implementation discipline

A research result does not directly become a regex.

For every new control, OpenDisipline requires:

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

The research does not establish that OpenDisipline:

- proves semantic correctness;
- prevents every prompt injection;
- detects every insecure agent action;
- proves a dependency version is vulnerability-free;
- guarantees that a green test suite means the requested behavior is correct;
- guarantees that a blocked operation could not be reproduced through an unmodeled OpenCode or host bypass.

Those limitations are part of the design contract rather than defects to hide.
