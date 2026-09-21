import type { DisciplineRule, RuleContext, RuleFinding } from "../core/rules.ts";
import { matchesPath } from "../scanners/paths.ts";

export const changeSurfaceRule: DisciplineRule = {
  id: "change-surface",
  check(ctx: RuleContext): RuleFinding[] {
    const count = ctx.changeFiles?.length ?? 1;
    const cfg = ctx.config.changeSurface;
    if (!cfg.enabled) return [];
    if (count >= cfg.blockAt) return [{ rule: "change-surface", severity: ctx.config.mode === "strict" ? "block" : "warn", message: "This operation touches " + count + " files, exceeding the block threshold of " + cfg.blockAt + ". Keep the change focused or explicitly raise the threshold." }];
    if (count >= cfg.warnAt) return [{ rule: "change-surface", severity: "warn", message: "This operation touches " + count + " files, exceeding the warning threshold of " + cfg.warnAt + ". Verify that every changed file is required." }];
    return [];
  },
};

export const testIntegrityRule: DisciplineRule = {
  id: "test-integrity",
  check(ctx: RuleContext): RuleFinding[] {
    const cfg = ctx.config.testIntegrity;
    if (!cfg.enabled || !matchesPath(ctx.filePath, cfg.paths)) return [];
    const weakened = /\.(?:skip|only)\s*\(|\b(?:xit|xdescribe)\s*\(|@(?:Ignore|Disabled)\b|pytest\.mark\.skip/.test(ctx.addedText);
    if (!weakened) return [];
    return [{ rule: "test-integrity", severity: ctx.config.mode === "strict" && cfg.severity === "block" ? "block" : "warn", message: "The change appears to disable, skip, or focus tests. Do not make implementation pass by weakening its test oracle." }];
  },
};