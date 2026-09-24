import type { Severity } from "../config.ts";
import type { DisciplineRule, RuleContext, RuleFinding } from "../core/rules.ts";
import { getExtension, normalizePath } from "../scanners/paths.ts";

interface SuppressionPattern {
  id: string;
  label: string;
  severity: "warn" | "block";
  extensions?: string[];
  re: RegExp;
}

const CODE_EXTENSIONS = new Set([
  ".ts",".tsx",".js",".jsx",".mjs",".cjs",".py",".pyi",".kt",".kts",".java",
  ".go",".rs",".cs",".fs",".fsx",".dart",".swift",".c",".h",".cc",".cpp",".cxx",
  ".hpp",".xml"
]);

const CONFIG_EXTENSIONS = new Set([
  ".json",".jsonc",".yaml",".yml",".toml",".ini",".properties",".editorconfig",
  ".props",".targets",".csproj",".vbproj",".gradle"
]);

// These are language-specific manifestations of one failure mode:
// suppressing a checker/linter instead of fixing the underlying issue.
// Broad/file-wide suppressions are higher severity than targeted suppressions.
const PATTERNS: SuppressionPattern[] = [
  { id:"ts-nocheck", label:"TypeScript file-wide type checking suppression", severity:"block", extensions:[".ts",".tsx",".js",".jsx"], re:/^\s*\/\/\s*@ts-nocheck\b/m },
  { id:"ts-ignore", label:"TypeScript line-level type error suppression", severity:"warn", extensions:[".ts",".tsx",".js",".jsx"], re:/\/\/\s*@ts-ignore\b/ },
  { id:"ts-expect-error", label:"TypeScript expected-error suppression", severity:"warn", extensions:[".ts",".tsx",".js",".jsx"], re:/\/\/\s*@ts-expect-error\b/ },
  { id:"eslint-broad", label:"ESLint broad suppression", severity:"block", extensions:[".ts",".tsx",".js",".jsx",".mjs",".cjs"], re:/\/\*\s*eslint-disable\s*\*\//i },
  { id:"eslint-targeted", label:"ESLint targeted suppression", severity:"warn", extensions:[".ts",".tsx",".js",".jsx",".mjs",".cjs"], re:/\/\/\s*eslint-disable(?:-next-line)?\b|\/\*\s*eslint-disable(?:-next-line)?\b/i },

  { id:"mypy-file", label:"Mypy file-wide type-error suppression", severity:"block", extensions:[".py",".pyi"], re:/^\s*#\s*mypy:\s*ignore-errors\b/im },
  { id:"mypy-ignore", label:"Mypy type-error suppression", severity:"warn", extensions:[".py",".pyi"], re:/#\s*type:\s*ignore(?:\[[^\]]+\])?/i },
  { id:"pyright-ignore", label:"Pyright type-error suppression", severity:"warn", extensions:[".py",".pyi"], re:/#\s*pyright:\s*ignore(?:\[[^\]]+\])?/i },
  { id:"ruff-noqa", label:"Ruff/Flake8 lint suppression", severity:"warn", extensions:[".py",".pyi"], re:/#\s*noqa\b/i },
  { id:"ruff-ignore", label:"Ruff lint suppression", severity:"warn", extensions:[".py",".pyi"], re:/#\s*ruff:\s*(?:ignore|file-ignore|disable)\b/i },

  { id:"kotlin-suppress", label:"Kotlin compiler/IDE suppression", severity:"warn", extensions:[".kt",".kts"], re:/@(?:file:)?Suppress\s*\(/ },
  { id:"android-suppress", label:"Android lint suppression", severity:"warn", extensions:[".kt",".java"], re:/@SuppressLint\s*\(/ },
  { id:"android-xml-ignore-all", label:"Android XML broad lint suppression", severity:"block", extensions:[".xml"], re:/\btools:ignore\s*=\s*"[^"]*\ball\b[^"]*"/i },
  { id:"android-xml-ignore", label:"Android XML lint suppression", severity:"warn", extensions:[".xml"], re:/\btools:ignore\s*=\s*"[^"]+"/i },

  { id:"go-nolint", label:"Go lint suppression", severity:"warn", extensions:[".go"], re:/\/\/\s*nolint(?:\b|:)|\/\/\s*lint:\s*ignore\b/i },

  { id:"rust-allow", label:"Rust lint suppression", severity:"warn", extensions:[".rs"], re:/#!?\[allow\s*\(/ },
  { id:"rust-expect", label:"Rust expected-lint suppression", severity:"warn", extensions:[".rs"], re:/#!?\[expect\s*\(/ },

  { id:"csharp-pragma-broad", label:"C# broad compiler-warning suppression", severity:"block", extensions:[".cs"], re:/#pragma\s+warning\s+disable\s*(?:\r?\n|$)/i },
  { id:"csharp-pragma", label:"C# compiler-warning suppression", severity:"warn", extensions:[".cs"], re:/#pragma\s+warning\s+disable\b/i },
  { id:"csharp-suppress-message", label:"C# analyzer suppression", severity:"warn", extensions:[".cs"], re:/\[\s*SuppressMessage\s*\(/ },
  { id:"dotnet-rule-none", label:".NET analyzer rule disabled", severity:"warn", extensions:[".editorconfig",".ini",".props",".targets",".csproj",".vbproj"], re:/dotnet_diagnostic\.[^=\r\n]+\.severity\s*=\s*none/i },

  { id:"dart-ignore-file", label:"Dart file-wide analyzer suppression", severity:"block", extensions:[".dart"], re:/^\s*\/\/\s*ignore_for_file\s*:/im },
  { id:"dart-ignore", label:"Dart analyzer suppression", severity:"warn", extensions:[".dart"], re:/\/\/\s*ignore\s*:/i },

  { id:"generic-noqa", label:"Generic linter suppression", severity:"warn", re:/\/\/\s*NOLINT\b|#\s*NOLINT\b|\/\/\s*noinspection\b/i },
];

function scanPath(path: string): boolean {
  const normalized = normalizePath(path);
  const ext = getExtension(normalized);
  return CODE_EXTENSIONS.has(ext) || CONFIG_EXTENSIONS.has(ext) || normalized === ".editorconfig" || normalized.endsWith("/.editorconfig");
}

export const suppressionRule: DisciplineRule = {
  id: "suppression",
  category: "integrity",
  defaultSeverity: "warn",
  contract: {
    evidence: "Added source/configuration text matches a language-specific checker, linter, analyzer, or compiler suppression pattern.",
    legitimateException: "A narrow, documented suppression can be legitimate when the underlying diagnostic is intentional and cannot be resolved without losing required behavior.",
    bypassAnalysis: "Unrecognized suppression syntax can evade this adapter; broad semantic suppression remains outside regex-only guarantees and should be covered by ecosystem-specific adapters.",
    testRequirements: { positive: "Detect representative broad and targeted suppressions across supported language families.", negative: "Do not report ordinary code without suppression directives.", exception: "Document the legitimate exception path without treating every suppression as automatically unsafe." },
  },
  check(ctx: RuleContext): RuleFinding[] {
    if (!ctx.config.enabled || !scanPath(ctx.filePath)) return [];
    const ext = getExtension(ctx.filePath);
    const findings: RuleFinding[] = [];

    for (const pattern of PATTERNS) {
      if (pattern.extensions && !pattern.extensions.includes(ext)) continue;
      if (!pattern.re.test(ctx.addedText)) continue;
      const severity: Severity =
        pattern.severity === "block" && ctx.config.mode === "strict" ? "block" : "warn";
      findings.push({
        rule: `suppression:${pattern.id}`,
        severity,
        message: `${pattern.label}. Treat suppressions as exceptions: prefer fixing the underlying diagnostic; when suppression is genuinely required, keep it narrow, explicit, and documented.`,
        evidence: `suppression:${pattern.id}`,
      });
    }

    return findings;
  },
};
