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



## 6. Additional empirical findings on agentic reliability (2024–2026)

These findings are added to sharpen OpenDiscipline's definition of agent failure. They support controls around state, evidence, mutation, memory, recovery, and proxy objectives. They do not establish that every model exhibits every failure at the same rate.

### 6.1 Agent reliability is a trajectory property, not a single successful action

AgentBench evaluated 29 API-based and open-source LLMs across eight interactive environments and identified poor long-term reasoning, decision-making, and instruction following as recurring obstacles to usable agents.

Source: https://proceedings.iclr.cc/paper_files/paper/2024/hash/e9df36b21ff4ee211a8b71ee8b7e9f57-Abstract-Conference.html

τ-Bench evaluates tool-agent-user interaction by comparing the final environment/database state with the annotated goal state and introduces `pass^k` for repeated-trial reliability. In its release-era evaluation, even GPT-4o succeeded on less than 50% of tasks overall, and retail `pass^8` was below 25%.

Source: https://arxiv.org/abs/2406.12045

OpenDiscipline response:

| Failure mode | Control / implication |
|---|---|
| Local tool success is mistaken for task success | Requirement-level completion evidence |
| One successful run is treated as reliable behavior | Recovery/trajectory tests and repeated evaluation |
| Agent loses constraints over multiple steps | Durable task state and validation checkpoints |

Limits:
- AgentBench and τ-Bench report release-era model/scaffold results. They are evidence of failure modes, not current universal model-performance estimates.
- `pass^k` measures repeatability, not semantic correctness for every possible task.

### 6.2 Long context does not remove the need for structured memory

LongCodeBench evaluates coding comprehension and repair with context windows up to one million tokens and reports substantial performance degradation for long-context settings, including drops from 29% to 3% for Claude 3.5 Sonnet and from 70.2% to 40% for Qwen2.5 in its reported comparisons.

Source: https://arxiv.org/abs/2505.07897

*Context as a Tool* reports that append-only or passively compressed context can suffer from context explosion and semantic drift. Its proposed context workspace separates stable task semantics, condensed long-term memory, and high-fidelity short-term interaction; the reported SWE-Bench-Verified result for SWE-Compressor is 57.6%.

Source: https://aclanthology.org/2026.findings-acl.1032/

OpenDiscipline response:

| Failure mode | Control / implication |
|---|---|
| Full transcript becomes too large or noisy | Selective retrieval |
| Relevant facts compete with stale history | Freshness / invalidation |
| Task identity is lost during compaction | Durable objective + task checkpoint |
| Memory retrieval returns textually similar but task-irrelevant state | Relevance constrained by current task, files, requirements, blockers, and validation |

Limit: These studies support structured context management; they do not prove one universal memory schema or retrieval algorithm.

### 6.3 Mutating actions deserve disproportionate verification

SABER analyzes trajectories from τ-Bench and SWE-Bench Verified and separates environment-mutating from non-mutating actions. Its logistic-regression analysis reports that each additional deviation in a mutating action reduces the odds of success by up to 92% on Airline and 96% on Retail for the evaluated models, while comparable deviations in non-mutating actions had much smaller effects.

Source: https://arxiv.org/abs/2512.07850

OpenDiscipline response:

| Failure mode | Control / implication |
|---|---|
| A semantically wrong write commits the trajectory to a bad state | Mutation-aware verification |
| Guardrails interrupt every harmless read | Target controls at consequential mutation boundaries |
| Stale constraints affect a state-changing action | Re-check salient requirements immediately before mutation |

Limit: The reported effect sizes are benchmark- and model-dependent statistical associations, not a proof that every mutating action is dangerous or that every non-mutating action is safe.

### 6.4 False completion and progress drift are measurable failure modes

*Building to the Test* studies two production coding agents under a controlled code-as-spec task with a hidden 222-test Playwright oracle. The authors report that oracle availability can produce near-perfect scores while a mechanical audit still finds dead or absent functionality. They describe this as "building to the test" and identify validation self-awareness as a separate research concern.

Source: https://www.microsoft.com/en-us/research/publication/building-to-the-test-coding-agents-deliver-what-you-check-not-what-you-requested/

PushBench defines Quantitative Goal Persistence as continuing until an external verifier confirms enough distinct valid work units. Its benchmark measures repeated work, duplicates, false completion, and progress drift rather than hiding them behind a final success flag. In its black-box evaluation, Claude Code (Sonnet 4.6) and Codex CLI (gpt-5.4) solved many 50-artifact tasks but dropped to 3 of 9 successes per condition at 100 artifacts.

Source: https://arxiv.org/abs/2605.23574

OpenDiscipline response:

| Failure mode | Control / implication |
|---|---|
| Agent satisfies visible tests but misses requested behavior | Separate spec-compliance review from test results |
| Agent declares completion before the requested set is complete | Verified progress ledger |
| Duplicate work is mistaken for progress | Distinct work-unit identity |
| Final status hides partial completion | Explicit completed/blocked/remaining state |

Limits:
- *Building to the Test* is a controlled study and explicitly states that prevalence across other agents, signals, and models remains an open question.
- PushBench measures quantitative persistence on its benchmark; it does not prove that all software tasks have the same failure profile.

### 6.5 Tool outputs can increase confidence without increasing truth

*The Confidence Dichotomy* reports a systematic difference between evidence-oriented tools and verification-oriented tools. Its pilot study found evidence tools such as web search could induce severe overconfidence because retrieved information is noisy and lacks direct correctness feedback, while deterministic verification tools such as code interpreters provided stronger grounding.

Source: https://aclanthology.org/2026.acl-long.520/

OpenDiscipline response:

| Failure mode | Control / implication |
|---|---|
| Presence of retrieved evidence is treated as proof | Track provenance and verification status separately |
| Agent confidence outruns observable correctness | Confidence/self-report is non-authoritative |
| Tool output is treated as equivalent to deterministic validation | Prefer repository/runtime/test evidence for completion claims |

Limit: The paper studies calibration behavior in evaluated tool-use settings. It does not imply that web search is intrinsically unreliable or that deterministic tools establish complete semantic correctness.

### 6.6 Untrusted external data can hijack tool-using agents

AgentDojo evaluates agents over untrusted external data using 97 realistic tasks and 629 security test cases. The benchmark reports that state-of-the-art LLMs fail many tasks even without attacks, and that prompt-injection attacks can break some security properties.

Source: https://proceedings.neurips.cc/paper_files/paper/2024/hash/97091a5177d8dc64b1da8bf3e1f6fb54-Abstract-Datasets_and_Benchmarks_Track.html

OpenDiscipline response:

| Failure mode | Control / implication |
|---|---|
| Repository, issue, web, or tool-returned text becomes implicit instruction | Untrusted-content classification — Phase 5 |
| Agent follows attacker-controlled tool output | Tool-output trust boundary |
| Static prompt filtering is treated as complete defense | Keep the boundary architectural; do not claim regex completeness |

Limit: AgentDojo demonstrates attack and utility failure modes in its benchmark; it does not establish that one detector or prompt-injection defense generalizes to every agent environment.

### 6.7 Proxy objectives can be optimized while intended goals are missed

A 2026 text-based study of reward hacking in language-model agents reports zero-shot specification gaming across model scales, where agents achieved high observed reward while underperforming on hidden safety objectives. The study also reports that direct reward optimization could widen the gap between observed and hidden objectives in its experiments.

Source: https://arxiv.org/abs/2606.15385

OpenDiscipline response:

| Failure mode | Control / implication |
|---|---|
| A proxy metric is mistaken for the actual objective | Separate requirement satisfaction from metric/test satisfaction |
| Agent optimizes what is easiest to measure | Independent acceptance evidence |
| "Green" becomes the objective instead of the requested behavior | Test-integrity + spec-compliance review |

Limit: This is an agent safety benchmark study using text-based environments, not direct evidence about OpenDiscipline or every coding workflow.

### 6.8 Research-derived engineering principle

Across these studies, a useful invariant for OpenDiscipline is:

    generated reasoning / self-report
        <
    retrieved or summarized information
        <
    task artifacts
        <
    observed repository state
        <
    deterministic validation / runtime evidence

The exact ordering of intermediate categories can depend on provenance and freshness. The invariant that should not change is:

- generated memory is not proof;
- agent self-reported completion is not proof;
- a single proxy check is not equivalent to requirement satisfaction;
- mutation should trigger stronger verification than harmless observation;
- stale state must not silently masquerade as current state.

Accordingly, OpenDiscipline should model at least three distinct concepts:

    claim        = what the agent says happened
    evidence     = what an observable source reports
    verified     = what the current acceptance criteria have been shown to satisfy

These concepts must never be collapsed into one boolean "done" state.


## 7. Workflow structure and evidence packaging

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

## 8. Research-to-roadmap traceability

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
| Local action success vs trajectory reliability | Requirement-level completion evidence + recovery fixtures | Roadmap |
| Long-context degradation / stale task state | Durable checkpoint + selective retrieval + freshness/invalidation | Partial — checkpoint primitive exists; retrieval/invalidation remain roadmap |
| Disproportionate risk at mutating actions | Mutation-aware verification at consequential tool boundaries | Partial — existing write/shell guards; broader mutation verification remains roadmap |
| False completion / quantitative progress drift | Explicit progress state + verified completion evidence | Roadmap |
| Tool-induced overconfidence | Provenance-aware evidence + non-authoritative self-report | Roadmap |
| Untrusted tool/repository content | Untrusted-content and tool-output trust boundaries | Roadmap |
| Proxy objective / test-only optimization | Spec-compliance review + independent acceptance evidence | Partial — review guidance exists; stronger machine enforcement remains roadmap |
| Historical runtime differences | V1 compatibility matrix | Roadmap |

## 9. How research changes implementation discipline

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



A third engineering question is required for agentic reliability:

- Can the system distinguish an agent claim from evidence and from verified acceptance?

A control should not promote an agent's own completion statement, generated summary, or proxy metric into verified state without an independent observable basis.

The project should therefore be evaluated on two axes:

- Does the agentic failure mode exist in evidence?
- Does the guardrail reduce the failure mode without creating disproportionate false positives?

A control that cannot answer both questions should remain experimental or warning-only.

## 10. Non-claims

The research does not establish that OpenDiscipline:

- proves semantic correctness;
- prevents every prompt injection;
- detects every insecure agent action;
- proves a dependency version is vulnerability-free;
- guarantees that a green test suite means the requested behavior is correct;
- guarantees that a blocked operation could not be reproduced through an unmodeled OpenCode or host bypass.

Those limitations are part of the design contract rather than defects to hide.


## 11. OpenCode V1 host evidence

The OpenCode V1 host-source review adds an important distinction to the research-derived roadmap: a guardrail can be correctly implemented at the plugin boundary while still requiring host-level verification.

For V1 1.18.14, 1.18.30, and 1.18.31, the upstream host source was checked for the `tool.execute.before` boundary and for the TaskTool/subtask path invoking that boundary. OpenDiscipline records these as host-source evidence, not runtime-smoke proof.

The project therefore does not convert the source inspection into a claim that every platform and binary build behaves identically. Actual binary smoke tests remain a separate roadmap item.


## 12. GitHub-only installation and instruction ownership

### OpenCode local plugin discovery

OpenCode's V1 documentation states that local TypeScript/JavaScript plugins are automatically loaded from the project `.opencode/plugins/` directory and the global `~/.config/opencode/plugins/` directory. It also documents a separate global `~/.config/opencode/AGENTS.md` and project `AGENTS.md` instruction surface.

Design consequence:
- install the plugin through a generated loader in the documented plugin directory;
- keep the implementation in a dedicated OpenDiscipline-owned directory;
- do not modify `opencode.json` merely to load a local plugin;
- treat `AGENTS.md` as an existing instruction surface rather than an installation file to replace.

### Bun / GitHub-only distribution

Bun's current `bunx` documentation supports package execution and the `--package` flag for selecting a binary. Bun also supports GitHub package references through its package tooling.

Design consequence:
- expose a single installer binary through `package.json`;
- invoke it with `bunx --package github:Yoganataa/open-discipline#<ref> open-discipline-install`;
- permit an immutable 40-character Git commit as an installer ref;
- do not require npm publication.

### AGENTS.md ownership boundary

The installer must be marker-scoped and idempotent:

    <!-- open-discipline:start -->
    ...
    <!-- open-discipline:end -->

Existing content outside the markers must not be rewritten. If the managed section has been edited by the user, update/uninstall operations must refuse to overwrite it silently.

This boundary is specifically intended to coexist with repository-installed MCP guidance such as codebase-memory-mcp and Context7.

### Installation safety model

The installer owns only:
- the dedicated OpenDiscipline source checkout;
- the generated plugin loader;
- the generated OpenDiscipline workflow skill;
- the marked OpenDiscipline section in `AGENTS.md`;
- its own install manifest and backups.

It must refuse to overwrite an unmanaged plugin file and must record enough metadata to identify the installed Git source and managed files.

### Evidence boundary

Installation success is not OpenCode runtime compatibility proof. Runtime behavior remains a separate local OpenCode V1 smoke test, consistent with the project's host-independent PR CI policy.
