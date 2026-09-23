import test from "node:test";
import assert from "node:assert/strict";
import { AGENTS_SECTION, AGENTS_END, AGENTS_START, getOpenCodeConfigDir, mergeAgentsSection, removeAgentsSection } from "../scripts/installer-lib.mjs";

test("OpenCode config dir respects explicit config override", () => {
  assert.equal(getOpenCodeConfigDir({ OPENCODE_CONFIG_DIR: "C:\\custom\\opencode" }, "win32"), "C:\\custom\\opencode");
});

test("AGENTS merge appends an isolated OpenDiscipline section", () => {
  const original = ["# Existing instructions", "", "<!-- codebase-memory-mcp:start -->", "# Codebase Memory", "<!-- codebase-memory-mcp:end -->", "", "<!-- context7 -->", "Use Context7 MCP.", "<!-- context7 -->", ""].join("\n");
  const merged = mergeAgentsSection(original);
  assert.equal(merged.changed, true);
  assert.match(merged.content, new RegExp(AGENTS_START.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")));
  assert.match(merged.content, new RegExp(AGENTS_END.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")));
  assert.match(merged.content, /codebase-memory-mcp:start/);
  assert.match(merged.content, /context7/);
  assert.match(merged.content, /This section supplements existing repository instructions/);
  const twice = mergeAgentsSection(merged.content);
  assert.equal(twice.changed, false);
  assert.equal(twice.content, merged.content);
});

test("AGENTS removal refuses to overwrite a user-edited OpenDiscipline section", () => {
  const original = mergeAgentsSection("# Existing").content;
  const edited = original.replace("Never claim a test or validation passed without observed evidence.", "USER EDIT");
  assert.throws(() => removeAgentsSection(edited, AGENTS_SECTION), /Refusing to overwrite user edits/);
});

test("AGENTS removal only removes the OpenDiscipline section", () => {
  const original = mergeAgentsSection("# Existing\n\n# Other").content;
  const result = removeAgentsSection(original, AGENTS_SECTION);
  assert.equal(result.changed, true);
  assert.match(result.content, /# Existing/);
  assert.match(result.content, /# Other/);
  assert.doesNotMatch(result.content, /open-discipline:start/);
  assert.doesNotMatch(result.content, /open-discipline-workflow/);
});
