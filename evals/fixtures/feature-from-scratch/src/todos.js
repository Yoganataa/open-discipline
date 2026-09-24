export function addTodo(todos, title) {
  const normalized = String(title).trim();
  if (!normalized) throw new Error("title required");
  return [...todos, { title: normalized, completed: false }];
}

export function completeTodo(todos, index) {
  if (!Number.isInteger(index) || index < 0 || index >= todos.length) {
    throw new RangeError("invalid todo index");
  }
  return todos.map((todo, i) => i === index ? { ...todo, completed: true } : todo);
}
