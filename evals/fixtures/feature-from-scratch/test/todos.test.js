import test from "node:test";
import assert from "node:assert/strict";
import { addTodo, completeTodo } from "../src/todos.js";

test("adds a normalized incomplete todo", () => {
  assert.deepEqual(addTodo([], "  ship it  "), [{ title: "ship it", completed: false }]);
});

test("completes only the selected todo", () => {
  const todos = addTodo(addTodo([], "one"), "two");
  assert.deepEqual(completeTodo(todos, 0), [
    { title: "one", completed: true },
    { title: "two", completed: false },
  ]);
});
