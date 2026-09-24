import test from "node:test";
import assert from "node:assert/strict";
import { parseOpenCodeStream } from "../evals/opencode-stream.ts";

test("parses tool calls, text, and step completion events", () => {
  const result = parseOpenCodeStream([
    JSON.stringify({ type: "step_start", sessionID: "ses_1" }),
    JSON.stringify({ type: "tool_use", part: { tool: "bash", state: { status: "completed", input: { command: "npm test" } } } }),
    JSON.stringify({ type: "text", part: { text: "Done" } }),
    JSON.stringify({ type: "step_finish", part: { reason: "stop" } }),
  ].join("\n"));

  assert.equal(result.invalidLines, 0);
  assert.deepEqual(result.toolCalls, [{ tool: "bash", input: { command: "npm test" } }]);
  assert.deepEqual(result.text, ["Done"]);
  assert.deepEqual(result.stepFinishes, ["stop"]);
  assert.equal(result.incompleteSteps, 0);
});

test("marks truncated JSON streams as incomplete instead of successful", () => {
  const result = parseOpenCodeStream(JSON.stringify({
    type: "step_start",
    sessionID: "ses_1",
    part: { type: "step-start" },
  }));

  assert.equal(result.incompleteSteps, 1);
  assert.deepEqual(result.stepFinishes, []);
});

test("invalid lines are counted and never become evidence", () => {
  const result = parseOpenCodeStream("not-json\n" + JSON.stringify({ type: "step_start" }));
  assert.equal(result.invalidLines, 1);
  assert.equal(result.incompleteSteps, 1);
});
