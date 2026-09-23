import test from "node:test";
import assert from "node:assert/strict";
import { slugify } from "../src/slug.js";

test("collapses punctuation into separators", () => {
  assert.equal(slugify("Hello,   World!"), "hello-world");
});

test("removes leading and trailing separators", () => {
  assert.equal(slugify("  Hello World  "), "hello-world");
});
