import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { validateScenario, validateEvaluationResult, requiredEvidencePassed, type Scenario, type EvaluationResult } from "../evals/contract.ts";

const root = process.cwd();
const scenarioDir = join(root, "evals", "scenarios");
const scenarioFiles = [
  "feature-from-scratch.json",
  "scope-drift.json",
  "false-completion.json",
  "memory-recovery.json",
];

test("all committed evaluation scenarios satisfy the contract", async () => {
  for (const file of scenarioFiles) {
    const raw = JSON.parse(await readFile(join(scenarioDir, file), "utf8")) as Scenario;
    assert.deepEqual(validateScenario(raw), [], file);
    assert.equal(raw.id + ".json", file);
  }
});

test("evaluation result cannot pass without explicit required evidence", () => {
  const scenario: Scenario = {
    schemaVersion: 1,
    id: "x",
    title: "x",
    kind: "feature",
    workflowLevel: "L1",
    objective: "x",
    fixture: "x",
    pressure: ["x"],
    requiredBehaviors: ["x"],
    forbiddenBehaviors: ["x"],
    evidence: [{ id: "proof", description: "proof", kind: "behavior", required: true }],
    modes: ["baseline", "guided"],
  };

  const result: EvaluationResult = {
    schemaVersion: 1,
    scenarioID: "x",
    mode: "guided",
    outcome: "completed",
    evidence: [{ id: "proof", observed: false }],
    failures: [],
  };

  assert.equal(requiredEvidencePassed(scenario, result), false);
});

test("evaluation result contract rejects omitted evidence arrays", () => {
  assert.deepEqual(
    validateEvaluationResult({
      schemaVersion: 1,
      scenarioID: "x",
      mode: "guided",
      outcome: "completed",
      failures: [],
    }),
    ["evidence"],
  );
});
