import test from "node:test";
import assert from "node:assert/strict";
import { profileLabel } from "../src/profile.js";

test("formats the current profile source", () => {
  assert.equal(profileLabel({ displayName: "Nata", role: "Developer" }), "Nata — Developer");
});
