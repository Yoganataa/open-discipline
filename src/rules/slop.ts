import type { Severity } from "../config.ts";
import type { DisciplineRule, RuleContext, RuleFinding } from "../core/rules.ts";
import { getExtension } from "../scanners/paths.ts";

interface SlopPattern {
  id: string;
  severity: Severity;
  label: string;
  reason: string;
  re: RegExp;
}

const PATTERNS: SlopPattern[] = [
  {
    id: "empty-catch",
    severity: "block",
    label: "Empty catch/except block",
    reason: "The exception is swallowed with no log, retry, or escalation — a silent failure in production.",
    re: /catch\s*(?:\([^)]*\))?\s*\{\s*\}|except(?:\s+[\w.]+(?:\s+as\s+\w+)?)?\s*:\s*(?:pass|\.\.\.)/,
  },
  {
    id: "secret",
    severity: "block",
    label: "Probable credential or API key",
    reason: "Committed secrets get rotated or exfiltrated. Use a vault or env vars.",
    re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b|\bAKIA[0-9A-Z]{16}\b|\bgh[pousr]_[A-Za-z0-9]{20,}\b|\bxox[baprs]-[A-Za-z0-9-]{20,}\b|\bAIza[0-9A-Za-z_-]{20,}\b/,
  },
  {
    id: "debug-residue",
    severity: "warn",
    label: "Debugging leftover",
    reason: "console.log / print / debugger / breakpoint left in the change.",
    re: /\b(?:console\.(?:log|debug|trace)\(|debugger\b|breakpoint\(|print(?:ln)?\()/,
  },
  {
    id: "todo",
    severity: "warn",
    label: "TODO/FIXME shipped with the change",
    reason: "The task is claimed done while unresolved markers were added.",
    re: /\b(?:TODO|FIXME|HACK|XXX)\s*:/,
  },
];

export const slopRule: DisciplineRule = {
  id: "slop",
  category: "quality",
  defaultSeverity: "warn",
  contract: {
    evidence: "Added text contains a deterministic pattern for swallowed errors, credential-shaped material, debug residue, or unresolved TODO markers.",
    legitimateException: "Intentional examples outside executable guarded code are outside this rule; the executable-code checks have no broad bypass because their evidence is intentionally conservative.",
    bypassAnalysis: "Regex-only detection can miss obfuscated or dynamically constructed forms. Changing surface syntax to evade a match is not evidence that the underlying risk is absent.",
    testRequirements: {
      positive: "Detect each major slop pattern in representative source for its supported ecosystem.",
      negative: "Do not report unrelated ordinary source text.",
      exception: "Keep non-code example/configuration cases outside the code-only checks and verify secret-shaped material degrades to WARN there.",
    },
  },
  check(ctx: RuleContext): RuleFinding[] {
    if (!ctx.config.enabled) return [];
    const ext = getExtension(ctx.filePath);
    const isCode = ctx.config.codeFileExtensions.includes(ext);
    const findings: RuleFinding[] = [];
    for (const p of PATTERNS) {
      if (!p.re.test(ctx.addedText)) continue;
      if (!isCode && p.id !== "secret") continue;
      const severity: Severity =
        p.id === "secret" && !isCode
          ? "warn"
          : p.severity === "block" && ctx.config.mode !== "strict"
            ? "warn"
            : p.severity;
      findings.push({
        rule: `slop:${p.id}`,
        severity,
        message: `${p.label}. ${p.reason}`,
        evidence: p.id === "secret" ? "credential-shaped token pattern" : p.id,
      });
    }
    return findings;
  },
};