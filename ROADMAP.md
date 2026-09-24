- debug residue detection;
- cross-language suppression detection;
- protected path writes;
- protected sensitive reads;
- test-oracle integrity checks;
- regression-evidence warning;
- guardrail self-protection;
- destructive shell/Git command protection;
- completion-evidence warning;
- validation-repetition warning;
- low-noise/idempotent policy context.

Acceptance:
- high-confidence violations can be blocked at \`tool.execute.before\`;
- ambiguous violations warn instead of pretending to be certain;
- each rule has observable evidence and positive/negative/exception tests;
- core guardrail paths cannot be modified through normal guarded writes;
- tests never weaken themselves to satisfy this phase.


---

# Phase 0.5 — Safe GitHub-only installation and instruction ownership

Status: [~]

Goal: make OpenDiscipline installable with `bunx` without npm publishing and without taking ownership of existing OpenCode/project configuration.

Installation UX decision: one cross-platform installer with `install`, `status`, and `uninstall` commands. GitHub source is supplied by Bun; the installer does not require Git on the target machine. Global is the default; `--local` is explicit. Uninstall verifies ownership hashes before removing anything. User-edited AGENTS.md content is never silently overwritten.

Implemented:
- GitHub-backed `bunx` installer entry point;
- global and project-local installation scopes;
- dedicated OpenDiscipline source checkout;
- generated local plugin loader under OpenCode's documented plugin directory;
- generated workflow skill under OpenCode's skill directory;
- marker-scoped `AGENTS.md` merge;
- refusal to overwrite an unmanaged plugin file;
- backup of files that OpenDiscipline owns before replacement;
- install manifest with source ref, resolved commit, scope, and managed-file hashes;
- duplicate-load guard when global and project-local copies point to the same plugin.