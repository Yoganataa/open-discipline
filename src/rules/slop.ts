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

/**
 * Deterministic scans of the added text for the failure modes agentic AI
 * reproduces most often (see research catalogue ai-development-pitfalls):
 * silent error handling, debug leftovers, silenced type errors, and secrets.
 * Each pattern is chosen to have near-zero false positives on a new write.
 */
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
  check(ctx: RuleContext): RuleFinding[] {
    if (!ctx.config.enabled) return [];
    const ext = getExtension(ctx.filePath);
    const isCode = ctx.config.codeFileExtensions.includes(ext);
    const findings: RuleFinding[] = [];
    for (const p of PATTERNS) {
      // Secrets live in string literals, so keep the raw source for this rule.
      // The other patterns intentionally remain text-based and conservative.
      if (!p.re.test(ctx.addedText)) continue;
      // Non-code files (config/.env/rules/docs) legitimately hold secrets in
      // dev, so only the secret pattern applies there — and it warns instead of
      // blocking, because a credential-shaped string in a config may be
      // intentional (e.g. MCP headers). The full scan stays code-only.
      if (!isCode && p.id !== "secret") continue;
      const severity: Severity =
        p.id === "secret" && !isCode
          ? "warn"
          : p.severity === "block" && ctx.config.mode !== "strict"
            ? "warn"
            : p.severity;
      findings.push({ rule: `slop:${p.id}`, severity, message: `${p.label}. ${p.reason}` });
    }
    return findings;
  },
};