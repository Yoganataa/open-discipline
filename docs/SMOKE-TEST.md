# OpenDiscipline OpenCode Runtime Smoke Test

This is a local host-compatibility test. It is intentionally not a pull-request CI gate.

The purpose is to answer one question that unit tests cannot answer:

> Does the actual OpenCode installation on the user's machine load OpenDiscipline and execute the V1 hook boundary with the expected enforcement behavior?

OpenCode's local plugin discovery loads TypeScript/JavaScript plugins from `.opencode/plugins/`, so this smoke test must be run from an OpenCode session using the repository's actual plugin installation.

## What gets produced

Each run creates an ignored directory under:

```
artifacts/open-discipline-smoke/<timestamp>-<mode>/
```

It contains:

- `events.ndjson` — raw hook and guard observations emitted by OpenDiscipline.
- `report.json` — machine-readable host metadata and check results.
- `report.md` — concise human-readable report.

Do not edit the report before sending it. `UNKNOWN` is intentional: it means the session did not provide enough evidence.

## Run 1 — normal host

From the repository root:

```sh
npm install
npm run smoke:opencode
```

This starts your installed `opencode` executable with smoke recording enabled.

Inside OpenCode, give the agent these instructions exactly enough to exercise the host:

1. Confirm that OpenDiscipline is loaded.
2. Ask it to create `artifacts/smoke-fixtures/warning.ts` containing a harmless TypeScript example with a `console.log("smoke")` statement. The file is disposable and ignored; do not modify existing project source.
3. Ask it to modify `src/index.ts` by adding a harmless comment. The operation must be attempted through the normal OpenCode edit/write tool and must be blocked by OpenDiscipline. Do not use shell commands to bypass the tool boundary.
4. Ask it to run `npm test` or `npm run typecheck` so the command boundary is exercised.
5. Ask it to use the Task/subtask mechanism for a tiny read-only investigation and report one fact back. Do not ask the subtask to edit files.
6. Stop after these checks. Do not make unrelated repository changes.

The expected evidence is:

- plugin initialization;
- `tool.execute.before`;
- a WARN finding for the harmless debug residue;
- a BLOCK for the protected `src/index.ts` write;
- a validation command crossing the command boundary;
- a second session ID if the Task/subtask actually creates a child session.

OpenCode's Task mechanism creates child sessions in the V1 host path; the smoke report therefore records session IDs rather than trusting the model's statement that a subtask ran.

Exit OpenCode normally. The runner then generates the report automatically.

## Run 2 — optional hooks disabled

This is a separate compatibility check. It deliberately removes OpenDiscipline's optional hooks while retaining the mandatory `tool.execute.before` boundary.

From the repository root:

```sh
npm run smoke:opencode -- --optional-hooks-off
```

Inside OpenCode, repeat only these checks:

1. Attempt the harmless `src/index.ts` comment edit again. It must still be blocked.
2. Create the disposable `artifacts/smoke-fixtures/warning.ts` debug example again.
3. Run one validation command.
4. Do not rely on context injection, permission.ask, or session.idle for the result.

This run is specifically checking that optional-hook absence does not disable core enforcement.

## How to send the result

After both runs finish, send these files:

```
artifacts/open-discipline-smoke/<normal-run>/report.json
artifacts/open-discipline-smoke/<normal-run>/report.md
artifacts/open-discipline-smoke/<normal-run>/events.ndjson

artifacts/open-discipline-smoke/<optional-hooks-off-run>/report.json
artifacts/open-discipline-smoke/<optional-hooks-off-run>/report.md
artifacts/open-discipline-smoke/<optional-hooks-off-run>/events.ndjson
```

You can also send the whole `artifacts/open-discipline-smoke/` directory as one archive.

The report records the exact OpenCode version, OS/architecture, Node version, repository commit, session count, raw hook observations, and derived check status. This is the evidence needed to update `COMPATIBILITY.md`; no compatibility claim should be changed merely because the OpenCode CLI started successfully.

## Interpretation

`PASS` means the expected observable evidence was recorded.

`FAIL` means a required smoke behavior was observed to be absent or the plugin did not load.

`UNKNOWN` means the smoke session did not produce enough evidence. It is not a pass and should not be converted into one manually.

The smoke test does not prove semantic correctness of the plugin, model behavior, or the entire OpenCode application. It is a host-boundary compatibility fixture.

