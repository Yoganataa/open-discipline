import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MEMORY_SCHEMA_VERSION,
  checkpointFromSessionState,
  getCheckpointPath,
  loadTaskCheckpoint,
  mergeCheckpointIntoSessionState,
  parseTaskCheckpoint,
  saveTaskCheckpoint,
} from "../src/runtime/memory.ts";
import { createSessionState } from "../src/runtime/session-state.ts";

test("checkpoint has a stable schema and captures validation evidence", () => {
  const state = createSessionState();
  state.validationAttempted = 2;
  state.lastValidationKey = "npm test";

  const checkpoint = checkpointFromSessionState("session-1", state, new Date("2026-09-22T12:00:00Z"));

  assert.equal(checkpoint.schemaVersion, MEMORY_SCHEMA_VERSION);
  assert.equal(checkpoint.sessionID, "session-1");
  assert.equal(checkpoint.validation[0]?.command, "npm test");
  assert.equal(checkpoint.validation[0]?.attempts, 2);
  assert.equal(checkpoint.validation[0]?.result, "attempted");
});

test("malformed or unsupported memory is rejected rather than guessed", () => {
  assert.equal(parseTaskCheckpoint({ schemaVersion: 99, sessionID: "x" }), undefined);
  assert.equal(parseTaskCheckpoint({ schemaVersion: 1, sessionID: "x", decisions: [], validation: [{ command: "x", attempts: 0, result: "attempted" }] }), undefined);
  assert.equal(parseTaskCheckpoint({ schemaVersion: 1, sessionID: "x", decisions: [{ id: "d", statement: "old", status: "active", source: "generated-summary" }], validation: [] })?.decisions[0]?.source, "generated-summary");
});

test("checkpoint survives process boundaries through atomic persistence", async () => {
  const directory = await mkdtemp(join(tmpdir(), "open-discipline-memory-"));
  const checkpoint = checkpointFromSessionState("session-2", createSessionState(), new Date("2026-09-22T12:00:00Z"));
  checkpoint.nextMove = "run focused tests";
  await saveTaskCheckpoint(directory, checkpoint);

  const loaded = await loadTaskCheckpoint(directory, "session-2");
  assert.equal(loaded?.nextMove, "run focused tests");

  const raw = await readFile(getCheckpointPath(directory, "session-2"), "utf8");
  assert.match(raw, /"schemaVersion": 1/);
});

test("checkpoint merge preserves observed validation evidence", () => {
  const state = createSessionState();
  const checkpoint = checkpointFromSessionState("session-3", state);
  checkpoint.validation = [{ command: "npm test", attempts: 3, result: "attempted" }];

  const merged = mergeCheckpointIntoSessionState(checkpoint, state);
  assert.equal(merged.validationAttempted, 3);
  assert.equal(merged.lastValidationKey, "npm test");
});


test("checkpoint context rendering is bounded and labels memory as non-authoritative", async () => {
  const { formatCheckpointContext } = await import("../src/runtime/memory.ts");
  const checkpoint = checkpointFromSessionState("session-4", createSessionState());
  checkpoint.objective = "Implement durable task recovery";
  checkpoint.nextMove = "Run focused recovery tests";
  const rendered = formatCheckpointContext(checkpoint, 300);
  assert.ok(rendered.length <= 300);
  assert.match(rendered, /OpenDiscipline task checkpoint/);
  assert.match(rendered, /not proof of current repository state/);
});
