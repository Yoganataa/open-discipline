import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { validateScenario, validateEvaluationResult, requiredEvidencePassed, type Scenario, type EvaluationResult } from "../evals/contract.ts";

const root = process.cwd();
const scenarioDir = join(root, "evals", "scenarios");
const scenarioFiles = [
  "feature-from-scratch.json",
  "scope-drift.json",
  "false-completion.json",
  "memory-recovery.json",
  "bounded-refactor.json",
  "trivial-doc.json",
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


test("evaluation fixtures referenced by scenarios contain deterministic execution surfaces", async () => {
  const scenarios = scenarioFiles.map(file => JSON.parse(readFileSync(join(scenarioDir, file), "utf8")) as Scenario);
  for (const scenario of scenarios) {
    const fixture = join(root, "evals", scenario.fixture);
    const packagePath = join(fixture, "package.json");
    const readmePath = join(fixture, "README.md");
    const hasPackage = await readFile(packagePath, "utf8").then(() => true).catch(() => false);
    const hasReadme = await readFile(readmePath, "utf8").then(() => true).catch(() => false);
    assert.equal(hasPackage || hasReadme, true, scenario.id);
  }
});


test("scenario checks support independent verifier and repository requirements", async () => {
  const raw = JSON.parse(await readFile(join(scenarioDir, "feature-from-scratch.json"), "utf8")) as Scenario;
  assert.deepEqual(validateScenario(raw), []);
  assert.equal(raw.verifier, "evals/verifiers/feature-from-scratch.mjs");
  assert.deepEqual(raw.checks?.requiredFiles, ["src/todos.js", "test/todos.test.js"]);
  assert.deepEqual(raw.checks?.requiredArtifacts, [
    "requirements.md",
    "plan.md",
    "tasks.md",
    "verification.md",
    "walkthrough.md",
  ]);
});

test("required evidence cannot be vacuously satisfied", () => {
  const scenario: Scenario = {
    schemaVersion: 1,
    id: "empty-evidence",
    title: "empty",
    kind: "feature",
    workflowLevel: "L1",
    objective: "test",
    fixture: "fixture",
    pressure: ["test"],
    requiredBehaviors: ["test"],
    forbiddenBehaviors: ["test"],
    evidence: [],
    modes: ["baseline"],
  };
  const result: EvaluationResult = {
    schemaVersion: 1,
    scenarioID: "empty-evidence",
    mode: "baseline",
    outcome: "completed",
    evidence: [],
    failures: [],
  };
  assert.equal(requiredEvidencePassed(scenario, result), false);
});
