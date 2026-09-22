import test from "node:test";
import assert from "node:assert/strict";
import { OpenDisipline } from "../src/index.ts";
import { parseApplyPatch } from "../src/scanners/patch.ts";
import { testIntegrityRule, testEvidenceRule } from "../src/rules/changes.ts";
import { suppressionRule } from "../src/rules/suppressions.ts";
import { mergeConfig } from "../src/config.ts";
import { guardShellCommand, isValidationCommand } from "../src/runtime/command.ts";
import { dependencyTruthRule } from "../src/rules/dependencies.ts";
import { architectureRule } from "../src/rules/architecture.ts";
import { RuleRegistry } from "../src/core/rules.ts";

async function plugin() {
  return OpenDisipline({
    directory: process.cwd(),
    worktree: process.cwd(),
    project: {} as never,
    client: {} as never,
    serverUrl: new URL("http://localhost"),
    experimental_workspace: { register() {} },
    $: {} as never,
  });
}

test("exposes V1 hooks", async () => {
  const p = await plugin();
  assert.equal(typeof p["tool.execute.before"], "function");
  assert.equal(typeof p["experimental.chat.messages.transform"], "function");
  assert.equal(typeof p["command.execute.before"], "function");
  assert.equal(typeof p["permission.ask"], "function");
});

test("blocks violating write", async () => {
  const p = await plugin();
  const h = p["tool.execute.before"]!;
  await assert.rejects(
    () => h(
      { tool: "write", sessionID: "s", callID: "c" },
      { args: { filePath: "src/OpenDisiplineUserRepository.ts", content: "export class OpenDisiplineUserRepository {}" } },
    ),
    /Open Disipline/,
  );
});

test("blocks protected reads at the tool boundary", async () => {
  const p = await plugin();
  const h = p["tool.execute.before"]!;
  await assert.rejects(
    () => h(
      { tool: "read", sessionID: "s", callID: "c" },
      { args: { filePath: ".env" } },
    ),
    /protected-file read/,
  );
});

test("permission hook uses current V1 read shape", async () => {
  const p = await plugin();
  const h = p["permission.ask"]!;
  const output = { status: "ask" as "ask" | "deny" | "allow" };
  await h({ type: "read", pattern: ".env.example", sessionID: "s", id: "per_test", metadata: {}, always: [] } as never, output);
  assert.equal(output.status, "ask");
});

test("retains removed patch text for integrity checks", () => {
  const changes = parseApplyPatch([
    "*** Update File: tests/example.test.ts",
    "@@",
    "-expect(result).toEqual(expected)",
    "+expect(result).toBeDefined()",
  ].join("\n"));
  assert.equal(changes[0]?.removedText, "expect(result).toEqual(expected)");
});

test("test integrity catches removed assertions and test deletion", () => {
  const config = mergeConfig({ mode: "strict", testIntegrity: { enabled: true, severity: "warn", paths: ["tests/**"] } });
  const findings = testIntegrityRule.check({
    filePath: "tests/example.test.ts",
    addedText: "expect(result).toBeDefined()",
    removedText: "expect(result).toEqual(expected)",
    config,
    deleted: false,
  });
  assert.ok(findings.some((x) => x.message.includes("removed")));
  const deletion = testIntegrityRule.check({
    filePath: "tests/example.test.ts",
    addedText: "",
    removedText: "",
    config,
    deleted: true,
  });
  assert.ok(deletion.some((x) => x.message.includes("deleted")));
});

test("test integrity catches vacuous assertions", () => {
  const config = mergeConfig({ mode: "strict", testIntegrity: { enabled: true, severity: "warn", paths: ["tests/**"] } });
  const findings = testIntegrityRule.check({
    filePath: "tests/example.test.ts",
    addedText: "expect(true).toBe(true)",
    config,
  });
  assert.ok(findings.some((x) => x.message.includes("vacuous")));
});


test("suppression guard covers major language families", () => {
  const config = mergeConfig({ mode: "strict" });
  const cases = [
    ["src/a.ts", "// @ts-nocheck"],
    ["src/a.py", "# type: ignore"],
    ["src/a.kt", "@Suppress(\"UNUSED\")"],
    ["src/a.java", "@SuppressLint(\"NewApi\")"],
    ["src/a.go", "//nolint:errcheck"],
    ["src/a.rs", "#[allow(dead_code)]"],
    ["src/a.cs", "#pragma warning disable"],
    ["lib/a.dart", "// ignore_for_file: unused_import"],
  ] as const;
  for (const [filePath, addedText] of cases) {
    const findings = suppressionRule.check({ filePath, addedText, config });
    assert.ok(findings.length > 0, `expected suppression detection for ${filePath}`);
  }
});


test("destructive command guard protects repository and guardrail paths", () => {
  const protectedPaths = ["src/rules/**", "discipline.config.json", ".opencode/plugins/open-disipline.ts"];
  assert.equal(guardShellCommand("git reset --hard", protectedPaths)?.severity, "block");
  assert.equal(guardShellCommand("rm -rf src/rules", protectedPaths)?.severity, "block");
  assert.equal(guardShellCommand("rm -rf ./tmp", protectedPaths)?.severity, "warn");
  assert.equal(guardShellCommand("git push origin main --force", protectedPaths)?.severity, "block");
  assert.equal(guardShellCommand("echo ok", protectedPaths), undefined);
  assert.equal(guardShellCommand("rm -rf .git", protectedPaths)?.severity, "block");
});

test("validation classifier covers common project stacks", () => {
  for (const command of [
    "npm test",
    "pytest",
    "go test ./...",
    "cargo test",
    "dotnet test",
    "./gradlew test",
    "flutter test",
    "swift test",
  ]) {
    assert.equal(isValidationCommand(command), true, command);
  }
});


test("tool boundary protects env reads", async () => {
  const p = await plugin();
  const h = p["tool.execute.before"]!;
  await assert.rejects(
    () => h(
      { tool: "read", sessionID: "s-read", callID: "c-read" },
      { args: { filePath: ".env" } },
    ),
    /protected-file read/,
  );
});


test("dependency truth flags undeclared JavaScript packages but ignores builtins and relative imports", async () => {
  const p = await plugin();
  const h = p["tool.execute.before"]!;
  await h(
    { tool: "write", sessionID: "dep", callID: "dep1" },
    { args: { filePath: "src/example.ts", content: "import fs from \"fs\";\nimport local from \"./local\";\nimport missing from \"definitely-not-declared-package\";" } },
  );
});


test("dependency rule and architecture boundary are deterministic", () => {
  const config = mergeConfig({
    mode: "strict",
    dependencyTruth: { enabled: true, severity: "warn" },
    architecture: {
      enabled: true,
      rules: [{ from: "src/ui/**", denyImports: ["src/database/", "@/database/"] }],
    },
  });
  const dependencyFindings = dependencyTruthRule.check({
    filePath: "src/a.ts",
    addedText: "import x from \"not-in-manifest\";",
    config,
    dependencyInventory: { javascript: [], python: [], go: [], rust: [], dart: [], javascriptTruth: {}, manifestIssues: [] },
  });
  assert.equal(dependencyFindings.length, 1);

  const architectureFindings = architectureRule.check({
    filePath: "src/ui/screen.ts",
    addedText: "import db from \"src/database/client\";",
    config,
  });
  assert.equal(architectureFindings.length, 1);
});


test("regression evidence warns when changed test has no recognizable oracle", () => {
  const config = mergeConfig({
    mode: "strict",
    testEvidence: { enabled: true, severity: "warn", paths: ["tests/**"] },
  });
  const findings = testEvidenceRule.check({
    filePath: "tests/fix.test.ts",
    addedText: "describe(\"fix\", () => { it(\"runs\", () => { doThing(); }); });",
    config,
    codeFiles: ["src/fix.ts"],
    testFiles: ["tests/fix.test.ts"],
    changeIndex: 1,
  });
  assert.ok(findings.some((x) => x.message.includes("assertion/oracle")));
});


test("rule registry deduplicates identical findings", () => {
  const registry = new RuleRegistry();
  registry.register({
    id: "duplicate-a",
    category: "quality",
    defaultSeverity: "warn",
    check: () => [
      { rule: "same", severity: "warn", message: "same evidence", evidence: "x" },
      { rule: "same", severity: "warn", message: "same evidence", evidence: "x" },
    ],
  });
  const findings = registry.runAll({ filePath: "src/a.ts", addedText: "", config: mergeConfig() });
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.evidence, "x");
});


test("dependency truth reports unresolved locally installed JavaScript APIs", async () => {
  const { discoverDependencies, inspectJavascriptImports } = await import("../src/runtime/project.ts");
  const inventory = await discoverDependencies(process.cwd());
  const evidence = await inspectJavascriptImports(process.cwd(), ["@opencode-ai/plugin/nonexistent-export"], inventory);
  assert.equal(evidence[0]?.resolved, false);
});

test("dependency addition detector distinguishes existing and new package entries", async () => {
  const { detectDependencyAdditions } = await import("../src/runtime/project.ts");
  const additions = detectDependencyAdditions({
    filePath: "package.json",
    addedText: JSON.stringify({
      dependencies: {
        "existing-package": "^1.0.0",
        "new-package": "^2.0.0"
      }
    }),
    source: "write"
  }, ["existing-package"]);
  assert.deepEqual(additions.map(x => x.name), ["new-package"]);
});
