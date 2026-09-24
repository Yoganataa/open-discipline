import test from "node:test";
import assert from "node:assert/strict";
import {
  canTransitionWorkflow,
  transitionWorkflow,
  validateWorkflowState,
  type WorkflowState,
} from "../src/runtime/workflow.ts";

function baseState(): WorkflowState {
  return {
    schemaVersion: 1,
    workflowID: "wf-1",
    level: "L2",
    status: "active",
    objective: "Ship a feature",
    requirements: [{
      id: "R1",
      statement: "The feature works",
      acceptance: ["A successful user flow is observable"],
    }],
    tasks: [{
      id: "T1",
      title: "Implement feature",
      requirements: ["R1"],
      status: "done",
      files: ["src/feature.ts"],
      verification: ["V1"],
    }],
    verifications: [{
      id: "V1",
      taskIDs: ["T1"],
      kind: "test",
      command: "npm test",
      observed: true,
      evidence: "exit code 0",
    }],
    updatedAt: "2026-09-23T00:00:00Z",
  };
}

test("workflow traceability accepts a completed task with observed evidence", () => {
  const result = validateWorkflowState({ ...baseState(), status: "complete" });
  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
});

test("completion rejects a task without observed verification evidence", () => {
  const state = baseState();
  state.verifications[0]!.observed = false;
  state.verifications[0]!.evidence = undefined;
  const result = validateWorkflowState({ ...state, status: "complete" });

  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "unobserved-verification"));
});

test("task-to-requirement and task-to-verification references must resolve", () => {
  const state = baseState();
  state.tasks[0]!.requirements = ["R404"];
  state.tasks[0]!.verification = ["V404"];

  const result = validateWorkflowState(state);
  assert.ok(result.issues.some((issue) => issue.code === "missing-requirement"));
  assert.ok(result.issues.some((issue) => issue.code === "missing-verification"));
});

test("observed verification requires explicit evidence", () => {
  const state = baseState();
  state.verifications[0]!.evidence = undefined;

  const result = validateWorkflowState(state);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "invalid-state"));
});

test("workflow transitions reject skipping the verification/review stages", () => {
  assert.equal(canTransitionWorkflow("active", "complete"), false);
  assert.equal(canTransitionWorkflow("active", "verifying"), true);

  assert.throws(
    () => transitionWorkflow({ ...baseState(), status: "active" }, "complete"),
    /Invalid workflow transition/,
  );

  const verifying = transitionWorkflow({ ...baseState(), status: "active" }, "verifying");
  const review = transitionWorkflow(verifying, "review");
  const complete = transitionWorkflow(review, "complete");

  assert.equal(complete.status, "complete");
});
