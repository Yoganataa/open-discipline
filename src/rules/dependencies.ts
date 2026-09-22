import type { DisciplineRule, RuleContext, RuleFinding } from "../core/rules.ts";
import { extractImports } from "../scanners/imports.ts";

const RELATIVE = /^(?:\\.|\\.\\.)\\//;
const BUILTINS = new Set([
  "assert","buffer","child_process","cluster","console","crypto","events","fs","http","https","module",
  "net","os","path","perf_hooks","process","stream","string_decoder","timers","tls","tty","url","util",
  "v8","vm","worker_threads","zlib","typing","asyncio","collections","dataclasses","functools","itertools",
  "json","logging","math","pathlib","re","subprocess","sys","time","typing_extensions"
]);

function topPackage(spec: string): string {
  return spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]!;
}

function dependencyName(filePath: string, spec: string): string | undefined {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  if (RELATIVE.test(spec) || spec.startsWith("#") || spec.startsWith("dart:") || spec.startsWith("package:")) return;
  if ([".ts",".tsx",".js",".jsx",".mjs",".cjs"].includes(ext)) {
    const p = topPackage(spec);
    return BUILTINS.has(p) ? undefined : p;
  }
  if ([".py",".pyi"].includes(ext)) {
    const p = spec.split(".")[0]!;
    return BUILTINS.has(p) ? undefined : p.replace(/_/g, "-").toLowerCase();
  }
  if (ext === ".go") {
    if (!spec.includes("/") || spec.startsWith("std/")) return;
    return spec;
  }
  if (ext === ".rs") {
    if (spec.startsWith("std::") || spec.startsWith("core::") || spec.startsWith("alloc::") || spec.startsWith("crate::") || spec.startsWith("self::") || spec.startsWith("super::")) return;
    return topPackage(spec);
  }
  return;
}

export const dependencyTruthRule: DisciplineRule = {
  id: "dependency-truth",
  category: "dependency",
  defaultSeverity: "warn",
  contract: {
    evidence: "A changed source file imports an external dependency that is absent from the detected manifest, or local JavaScript resolution cannot resolve a declared import.",
    legitimateException: "Workspace aliases, generated code, and ecosystem-specific import-to-distribution mappings may require adapter configuration; ambiguous cases remain warnings.",
    bypassAnalysis: "Local manifest truth does not prove runtime availability in every environment. The rule deliberately avoids network lookup and invented package/API mappings.",
    testRequirements: {
      positive: "Detect an undeclared external import and an unresolved declared JavaScript API.",
      negative: "Ignore relative imports and supported builtins.",
      exception: "Do not report a declared dependency merely because its runtime installation is unavailable; report only the local resolution evidence when available.",
    },
  },
  check(ctx: RuleContext): RuleFinding[] {
    const deps = ctx.dependencyInventory;
    if (!deps) return [];

    const findings: RuleFinding[] = [];
    for (const spec of extractImports(ctx.filePath, ctx.addedText)) {
      const name = dependencyName(ctx.filePath, spec);
      if (!name) continue;

      const ext = ctx.filePath.slice(ctx.filePath.lastIndexOf(".")).toLowerCase();
      const list = ext === ".go" ? deps.go : ext === ".rs" ? deps.rust : ext === ".py" ? deps.python : deps.javascript;

      if (!list.some((x) => x.toLowerCase() === name.toLowerCase())) {
        findings.push({
          rule: "dependency-truth",
          severity: ctx.config.dependencyTruth.severity === "block" && ctx.config.mode === "strict" ? "block" : "warn",
          message: `Imported external dependency "${name}" is not declared in the detected project manifest. Verify the package name/API and update the correct manifest if it is genuinely required.`,
          evidence: `import ${spec}`,
        });
        continue;
      }

      const evidence = ctx.dependencyEvidence?.find((x) => x.spec === spec);
      if (evidence && !evidence.resolved && ctx.filePath.match(/\.(ts|tsx|js|jsx|mjs|cjs)$/i)) {
        findings.push({
          rule: "dependency-api-truth",
          severity: "warn",
          message: `Dependency "${name}" is declared but the imported API path "${spec}" cannot be resolved from the local installed dependency tree. Do not invent an API; verify the installed package/version and its exports.`,
          evidence: `import ${spec}`,
        });
      }
    }

    if (ctx.changeIndex === 0 && deps.manifestIssues.length) {
      for (const issue of deps.manifestIssues.slice(0, 5)) {
        findings.push({
          rule: "dependency-lock-consistency",
          severity: "warn",
          message: `Dependency manifest/lockfile consistency issue: ${issue}`,
          evidence: "package.json/package-lock.json",
        });
      }
    }

    return findings;
  },
};
