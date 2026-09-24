import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

test("workflow specification defines adaptive L0-L3 lifecycle and evidence artifacts", async () => {
  const workflow = await readFile(join(root, "docs/WORKFLOW.md"), "utf8");
  for (const marker of [
    "L0 — Trivial",
    "L1 — Small change",
    "L2 — Feature",
    "L3 — Architectural / high-risk",
    "intent.md",
    "requirements.md",
    "design.md",
    "plan.md",
    "tasks.md",
    "verification.md",
    "walkthrough.md",
    "Spec compliance",
    "Code quality",
    "End-user verification",
  ]) {
    assert.ok(workflow.includes(marker), marker);
  }
});

test("native workflow skill exists and rejects evidence-free completion", async () => {
  const skill = await readFile(join(root, ".opencode/skills/open-discipline-workflow/SKILL.md"), "utf8");
  assert.match(skill, /name: open-discipline-workflow/);
  assert.match(skill, /Choose the smallest justified level/);
  assert.match(skill, /Never report a validation command as passing unless its result was actually observed/);
  assert.match(skill, /If any answer is no, do not claim the task is complete/);
});

test("workflow artifact guide points to the canonical workflow specification", async () => {
  const guide = await readFile(join(root, "docs/work/README.md"), "utf8");
  assert.match(guide, /docs\/WORKFLOW\.md/);
});
