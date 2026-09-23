# Behavioral evaluation fixtures

Each fixture is intentionally small and self-contained. The fixture is the execution surface for a scenario; the scenario contract defines what behavior and evidence must be observed.

Fixtures are not agent transcripts. They provide deterministic repositories for baseline/guided behavioral evaluation.

Current fixture classes:
- trivial-doc: L0 documentation-only change.
- scope-drift: L1 bounded bugfix/scope discipline.
- false-completion: L1 bugfix with regression/evidence pressure.
- feature-from-scratch: L2 user-visible feature.
- bounded-refactor: L2 bounded refactor.
- memory-recovery: L2 context-loss recovery.
