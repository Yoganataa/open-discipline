import type { DisciplineRule, RuleContext, RuleFinding } from "../core/rules.ts";
import { getExtension, matchesPath } from "../scanners/paths.ts";

export const changeSurfaceRule: DisciplineRule = {
  id: "change-surface",
  check(ctx: RuleContext): RuleFinding[] {
    const count = ctx.changeFiles?.length ?? 1;
    const cfg = ctx.config.changeSurface;
    if (!cfg.enabled || ctx.changeIndex !== 0) return [];
    if (count >= cfg.blockAt) return [{ rule: "change-surface", severity: ctx.config.mode === "strict" ? "block" : "warn", message: `This operation touches ${count} guarded files, exceeding the block threshold of ${cfg.blockAt}. Keep the change focused or explicitly raise the threshold.` }];
    if (count >= cfg.warnAt) return [{ rule: "change-surface", severity: "warn", message: `This operation touches ${count} guarded files, exceeding the warning threshold of ${cfg.warnAt}. Verify that every changed file is required.` }];
    return [];
  },
};

export const testIntegrityRule: DisciplineRule = {
  id: "test-integrity",
  check(ctx: RuleContext): RuleFinding[] {
    const cfg = ctx.config.testIntegrity;
    if (!cfg.enabled || !matchesPath(ctx.filePath, cfg.paths)) return [];
    const added = ctx.addedText;
    const removed = ctx.removedText ?? "";
    const findings: RuleFinding[] = [];
    const disabled = /\.(?:skip|only)\s*\(|\b(?:xit|xdescribe)\s*\(|@(?:Ignore|Disabled)\b|pytest\.mark\.skip/.test(added);
    const vacuous = /\b(?:expect|assert)\s*\(\s*true\s*\)|\bassert\.(?:ok|equal)\s*\(\s*true(?:\s*[,)]|\s*$)/.test(added);
    const removedOracle = /\bexpect\s*\(|\bassert(?:\.[A-Za-z_$][\w$]*)?\s*\(|\.to(?:Be|Equal|StrictEqual|Contain|Match|Throw|Rejects|Satisfy)\s*\(/.test(removed);
    if (disabled) findings.push({ rule: "test-integrity", severity: cfg.severity === "block" && ctx.config.mode === "strict" ? "block" : "warn", message: "The change appears to disable, skip, or focus tests. Do not make implementation pass by weakening its test oracle." });
    if (vacuous) findings.push({ rule: "test-integrity", severity: cfg.severity === "block" && ctx.config.mode === "strict" ? "block" : "warn", message: "The added test assertion appears vacuous (for example, asserting true). Preserve an assertion about the behavior being fixed." });
    if (removedOracle) findings.push({ rule: "test-integrity", severity: "warn", message: "Existing test assertions appear to be removed by this change. Verify that the regression oracle was intentionally replaced, not weakened." });
    if (ctx.deleted) findings.push({ rule: "test-integrity", severity: "warn", message: "A test file is being deleted. Do not remove regression coverage merely to make the implementation pass." });
    return findings;
  },
};

export const testEvidenceRule: DisciplineRule = {
  id: "test-evidence",
  check(ctx: RuleContext): RuleFinding[] {
    const cfg = ctx.config.testEvidence;
    if (!cfg.enabled || !ctx.codeFiles?.length) return [];
    const severity = cfg.severity === "block" && ctx.config.mode === "strict" ? "block" : "warn";
    if (ctx.changeIndex === 0 && !ctx.testFiles?.length) {
      return [{ rule: "test-evidence", severity, message: "This operation changes code but no test file was changed. Add or update a regression test when behavior changed, or explicitly verify why existing test coverage is sufficient." }];
    }
    if (ctx.testFiles?.length && matchesPath(ctx.filePath, cfg.paths)) {
      const assertionLike = /\b(?:expect|assert|require|assert_eq|assert_ne|assert!|should|toHave|toBe|toEqual|Assert\.)\b|\bassert\s*\(/i;
      if (!assertionLike.test(ctx.addedText)) {
        return [{ rule: "test-evidence", severity: "warn", message: "A test file changed alongside code, but the added patch contains no recognizable assertion/oracle. Verify that the regression test actually exercises the behavior being fixed." }];
      }
    }
    return [];
  },
};
