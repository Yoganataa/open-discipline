# OpenDiscipline Behavioral Evaluation

This directory contains versioned evaluation scenarios for workflow, guardrail, and memory behavior.

These evaluations are separate from plugin/runtime CI.

## Test layers

1. Deterministic contract tests:
   - validate scenario schema;
   - validate expected evidence fields;
   - validate grading rules.
2. Behavioral evaluations:
   - run an actual agent/runtime against a scenario;
   - capture normalized evidence;
   - compare baseline vs guided runs.
3. Human or model-assisted review:
   - only where deterministic evidence cannot establish the behavior.

A scenario file is evidence of what should be tested. It is not evidence that an agent passed.

## Scenario structure

Each scenario declares:
- task class and workflow level;
- objective;
- repository/fixture reference;
- pressure conditions;
- required behaviors;
- forbidden behaviors;
- deterministic evidence checks;
- baseline/guided applicability.

Results belong outside version control by default. Do not commit model transcripts or generated run output as test fixtures unless deliberately reduced to a stable regression case.

## Current scenarios

- feature-from-scratch.json
- scope-drift.json
- false-completion.json
- memory-recovery.json

The initial set intentionally covers different failure modes rather than repeating happy-path feature work.

## Contract validation

Run:

    npm run eval:validate

This validates committed scenario definitions only. It does not launch an agent and does not claim that OpenDiscipline improves model behavior.

## Behavioral runner contract

A future executor must produce a normalized result with:
- scenario ID;
- mode: baseline or guided;
- outcome;
- evidence;
- failures;
- timestamps;
- executor/model metadata.

The evaluator distinguishes:
- no evidence;
- explicit pass evidence;
- explicit failure evidence.

An omitted field is never interpreted as success.

## Behavioral runner

The behavioral runner is intentionally manual/on-demand and is not a blocking PR check. It runs an actual user-installed OpenCode binary against an isolated temporary copy of a fixture, initializes a disposable Git repository for changed-file evidence, and stores raw JSONL output plus normalized results.

Run a guided evaluation:

    npm run eval:behavior -- --scenario feature-from-scratch --mode guided

Run the same scenario as a baseline:

    npm run eval:behavior -- --scenario feature-from-scratch --mode baseline

Optional flags:

    --model <provider/model>
    --opencode <path-or-command>
    --timeout-ms <milliseconds>
    --output <directory>

The runner treats missing evidence as `unknown`, not pass. It also preserves raw event output because OpenCode's JSON stream has had documented cases of dropping `text` or final `step_finish` events before process exit. The JSON stream is therefore evidence, not an authoritative transcript.

Known OpenCode V1 JSON-stream limitations are tracked separately from OpenDiscipline behavior. Do not infer successful completion solely from process exit code or a truncated event stream.

Guided mode currently injects only the OpenDiscipline workflow skill and a minimal repository instruction. It does not install the full plugin. This isolates workflow behavior from runtime guardrail behavior; plugin smoke tests remain the separate host-compatibility evidence path.