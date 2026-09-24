import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const workspace = process.argv[2];
if (!workspace) throw new Error("workspace argument required");

const moduleURL = pathToFileURL(workspace + "/src/todos.js").href + "?verify=" + Date.now();
const { removeTodo } = await import(moduleURL);
assert.equal(typeof removeTodo, "function");

const todos = [
  { title: "one", completed: false },
  { title: "two", completed: true },
  { title: "three", completed: false },
];

const result = removeTodo(todos, 1);
assert.deepEqual(result, [
  { title: "one", completed: false },
  { title: "three", completed: false },
]);
assert.notEqual(result, todos);
assert.deepEqual(todos, [
  { title: "one", completed: false },
  { title: "two", completed: true },
  { title: "three", completed: false },
]);
assert.throws(() => removeTodo(todos, -1), RangeError);
assert.throws(() => removeTodo(todos, 3), RangeError);

console.log("feature-from-scratch verifier: PASS");
