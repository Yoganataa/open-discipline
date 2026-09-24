import test from "node:test";
import assert from "node:assert/strict";
import { mergeConfig } from "../src/config.ts";
import { slopRule } from "../src/rules/slop.ts";
import { suppressionRule } from "../src/rules/suppressions.ts";

const code = (addedText: string) => ({ filePath: "src/FooRepository.ts", addedText, config: mergeConfig({}) });

test("blocks empty catch", () => {
  const fs = slopRule.check(code("try { x() } catch (e) {\n}"));
  assert.ok(fs.some((f) => f.rule === "slop:empty-catch" && f.severity === "block"));
});

test("blocks empty python except-pass", () => {
  const fs = slopRule.check({
    filePath: "src/app.py",
    addedText: "try:\n    x()\nexcept Exception:\n    pass",
    config: mergeConfig({}),
  });
  assert.ok(fs.some((f) => f.rule === "slop:empty-catch"));
});

test("warns on debug residue and type ignores", () => {
  const fs = slopRule.check(code("console.log(x); debugger; // @ts-ignore"));
  assert.ok(fs.some((f) => f.rule === "slop:debug-residue"));
  const suppression = suppressionRule.check(code("// @ts-ignore"));
  assert.ok(suppression.some((f) => f.rule === "suppression:ts-ignore"));
});

test("blocks secret patterns", () => {
  const fs = slopRule.check(code("const key = 'sk-proj-abcdefghijklmnopqrstuvwxyz1234567890';"));
  assert.ok(fs.some((f) => f.rule === "slop:secret" && f.severity === "block"));
});

test("allows harmless code", () => {
  assert.deepEqual(slopRule.check(code("const list = items.map((x) => x.id);")), []);
});

test("advisory mode downgrades blocks to warn", () => {
  const fs = slopRule.check({
    filePath: "src/a.ts",
    addedText: "try {} catch (e) {}",
    config: mergeConfig({ mode: "advisory" }),
  });
  assert.ok(fs.length > 0 && fs.every((f) => f.severity === "warn"));
});

test("does not scan non-code files", () => {
  assert.deepEqual(slopRule.check({ filePath: "notes.md", addedText: "console.log('hi')", config: mergeConfig({}) }), []);
});

test("warns (not blocks) on secrets in env and config", () => {
  const env = slopRule.check({ filePath: ".env", addedText: "API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz1234567890", config: mergeConfig({}) });
  assert.ok(env.some((f) => f.rule === "slop:secret" && f.severity === "warn"));
  const conf = slopRule.check({ filePath: "opencode.json", addedText: "\"x-api-key\": \"ghp_abcdefghijklmnopqrstuvwxyz123456\"", config: mergeConfig({}) });
  assert.ok(conf.some((f) => f.rule === "slop:secret" && f.severity === "warn"));
});

test("warns on secrets in rules files", () => {
  const fs = slopRule.check({ filePath: "AGENTS.md", addedText: "export const token = 'ghp_abcdefghijklmnopqrstuvwxyz123456'", config: mergeConfig({}) });
  assert.ok(fs.some((f) => f.rule === "slop:secret" && f.severity === "warn"));
});