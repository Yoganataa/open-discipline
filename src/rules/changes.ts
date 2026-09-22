import type { DisciplineRule, RuleContext, RuleFinding } from "../core/rules.ts";
import { getExtension, matchesPath, normalizePath } from "../scanners/paths.ts";

export const changeSurfaceRule: DisciplineRule = {
  id: "change-surface",
  category: "scope",
  defaultSeverity: "warn",
  contract: {
    evidence: "The guarded operation changes a measurable number of files at or above configured thresholds.",
    legitimateException: "A deliberately broad change is legitimate when the project configuration explicitly raises the thresholds.",
    bypassAnalysis: "Splitting one broad operation into multiple writes does not establish that the overall task is focused; the current rule deliberately scopes itself to one tool operation.",
    testRequirements: { positive: "Warn and block at configured thresholds.", negative: "Allow operations below the warning threshold.", exception: "Respect an explicitly raised threshold." },
  },
  check(ctx: RuleContext): RuleFinding[] {
    const count = ctx.changeFiles?.length ?? 1;
    const cfg = ctx.config.changeSurface;
    if (!cfg.enabled || ctx.changeIndex !== 0) return [];
    if (count >= cfg.blockAt) return [{ rule: "change-surface", severity: ctx.config.mode === "strict" ? "block" : "warn", message: `This operation touches ${count} guarded files, exceeding the block threshold of ${cfg.blockAt}. Keep the change focused or explicitly raise the threshold.`, evidence: `guarded-files:${count}` }];
    if (count >= cfg.warnAt) return [{ rule: "change-surface", severity: "warn", message: `This operation touches ${count} guarded files, exceeding the warning threshold of ${cfg.warnAt}. Verify that every changed file is required.`, evidence: `guarded-files:${count}` }];
    return [];
  },
};

export const testIntegrityRule: DisciplineRule = {
  id: "test-integrity",
  category: "integrity",
  defaultSeverity: "warn",
  contract: {
    evidence: "Added or removed test text contains a recognized suppression, vacuous oracle, removed assertion, or deleted test file.",
    legitimateException: "Intentional test restructuring is legitimate when the replacement preserves a behavior-specific oracle rather than weakening coverage.",
    bypassAnalysis: "Changing assertion syntax can evade this heuristic; the rule therefore reports observable evidence and does not claim semantic test correctness.",
    testRequirements: { positive: "Detect skipped/focused tests, vacuous assertions, removed or deleted test oracles.", negative: "Allow ordinary behavior-specific assertions.", exception: "Allow intentional replacement when a meaningful oracle remains." },
  },
  check(ctx: RuleContext): RuleFinding[] {
    const cfg = ctx.config.testIntegrity;
    if (!cfg.enabled || !matchesPath(ctx.filePath, cfg.paths)) return [];
    const added = ctx.addedText;
    const removed = ctx.removedText ?? "";
    const findings: RuleFinding[] = [];
    const disabled = /\.(?:skip|only)\s*\(|\b(?:xit|xdescribe)\s*\(|@(?:Ignore|Disabled)\b|pytest\.mark\.skip/.test(added);
    const vacuous = /\b(?:expect|assert)\s*\(\s*true\s*\)|\bassert\.(?:ok|equal)\s*\(\s*true(?:\s*[,)]|\s*$)/.test(added);
    const removedOracle = /\bexpect\s*\(|\bassert(?:\.[A-Za-z_$][\w$]*)?\s*\(|\.to(?:Be|Equal|StrictEqual|Contain|Match|Throw|Rejects|Satisfy)\s*\(/.test(removed);
    if (disabled) findings.push({ rule: "test-integrity", severity: cfg.severity === "block" && ctx.config.mode === "strict" ? "block" : "warn", message: "The change appears to disable, skip, or focus tests. Do not make implementation pass by weakening its test oracle.", evidence: "test-suppression" });
    if (vacuous) findings.push({ rule: "test-integrity", severity: cfg.severity === "block" && ctx.config.mode === "strict" ? "block" : "warn", message: "The added test assertion appears vacuous (for example, asserting true). Preserve an assertion about the behavior being fixed.", evidence: "vacuous-assertion" });
    if (removedOracle) findings.push({ rule: "test-integrity", severity: "warn", message: "Existing test assertions appear to be removed by this change. Verify that the regression oracle was intentionally replaced, not weakened.", evidence: "removed-test-oracle" });
    if (ctx.deleted) findings.push({ rule: "test-integrity", severity: "warn", message: "A test file is being deleted. Do not remove regression coverage merely to make the implementation pass.", evidence: `deleted-test:${ctx.filePath}` });
    return findings;
  },
};

export const testEvidenceRule: DisciplineRule = {
  id: "test-evidence",
  category: "integrity",
  defaultSeverity: "warn",
  contract: {
    evidence: "A code change has no changed test file, or a changed test file contains no recognizable assertion/oracle.",
    legitimateException: "Behavior-preserving changes may legitimately reuse existing tests; this rule warns rather than claiming that every code edit requires a new test.",
    bypassAnalysis: "A recognizable assertion is not proof of semantic coverage; the rule intentionally stops at observable test-oracle evidence.",
    testRequirements: { positive: "Warn when code changes lack test-file changes and when changed tests lack a recognizable oracle.", negative: "Allow code changes accompanied by recognizable test assertions.", exception: "Allow legitimate implementation-only changes as warnings rather than false blocks." },
  },
  check(ctx: RuleContext): RuleFinding[] {
    const cfg = ctx.config.testEvidence;
    if (!cfg.enabled || !ctx.codeFiles?.length) return [];
    const severity = cfg.severity === "block" && ctx.config.mode === "strict" ? "block" : "warn";
    if (ctx.changeIndex === 0 && !ctx.testFiles?.length) {
      return [{ rule: "test-evidence", severity, message: "This operation changes code but no test file was changed. Add or update a regression test when behavior changed, or explicitly verify why existing test coverage is sufficient.", evidence: `code-files:${ctx.codeFiles?.length ?? 0};test-files:0` }];
    }
    if (ctx.testFiles?.length && matchesPath(ctx.filePath, cfg.paths)) {
      const assertionLike = /\b(?:expect|assert|require|assert_eq|assert_ne|assert!|should|toHave|toBe|toEqual|Assert\.)\b|\bassert\s*\(/i;
      if (!assertionLike.test(ctx.addedText)) {
        return [{ rule: "test-evidence", severity: "warn", message: "A test file changed alongside code, but the added patch contains no recognizable assertion/oracle. Verify that the regression test actually exercises the behavior being fixed.", evidence: "test-oracle-not-recognized" }];
      }
    }
    return [];
  },
};

export const rootCauseFixEvidenceRule: DisciplineRule = {
  id: "root-cause-fix-evidence",
  category: "integrity",
  defaultSeverity: "warn",
  contract: {
    evidence: "A code change is observed without a previously observed regression-test oracle in the same guarded session.",
    legitimateException: "A behavior-preserving change, test-first work already performed outside the current session, or an implementation-only change may legitimately lack a preceding test write; this rule therefore warns rather than blocks.",
    bypassAnalysis: "This evidence is limited to observable writes in the current session. OpenCode V1 does not expose a portable command exit status here, so the rule cannot claim that a specific failure caused the fix.",
    testRequirements: {
      positive: "Warn when a code change occurs before any recognizable regression-test evidence in the session.",
      negative: "Do not warn when a recognizable test oracle was observed before the code change.",
      exception: "Warn rather than block when no failure signal is available from the host.",
    },
  },
  check(ctx: RuleContext): RuleFinding[] {
    const isCodeFile = ctx.config.codeFileExtensions.includes(ctx.filePath.slice(ctx.filePath.lastIndexOf(".")));
    if (!isCodeFile || ctx.changeIndex !== undefined && ctx.changeIndex < 0) return [];
    if (ctx.priorRegressionTestEvidence) return [];
    return [{
      rule: "root-cause-fix-evidence",
      severity: "warn",
      message: "Code changed without prior regression-test evidence in this session. Add or update a behavior-specific regression oracle before treating the implementation change as a demonstrated fix.",
      evidence: "code-change-without-prior-regression-test",
    }];
  },
};

export const scopeIntentRule: DisciplineRule = {
  id: "scope-intent",
  category: "scope",
  defaultSeverity: "warn",
  contract: {
    evidence: "The current session has an explicit user-declared file/path surface, and the guarded change targets a path outside that declared surface.",
    legitimateException: "A change is legitimate when its path is explicitly named by the current user task, or when no reliable path intent was captured; the latter deliberately degrades to change-surface evidence.",
    bypassAnalysis: "This adapter extracts explicit path references only. It does not infer semantic intent from prose, and it cannot prove that an unmentioned file is unnecessary.",
    testRequirements: {
      positive: "Warn when an explicit task path exists and a changed file is outside that declared surface.",
      negative: "Do not warn when the changed file matches a declared path.",
      exception: "Do not warn when no explicit path intent is available.",
    },
  },
  check(ctx: RuleContext): RuleFinding[] {
    const intent = ctx.taskIntent;
    if (!intent?.declaredPaths.length) return [];
    const path = normalizePath(ctx.filePath);
    if (intent.declaredPaths.some(pattern => matchesPath(path, [pattern]))) return [];
    return [{ rule: "scope-intent", severity: "warn", message: 'Changed path "' + path + '" is outside the explicitly declared task surface. Verify that this additional file is required; this rule does not infer semantic intent.', evidence: "changed:" + path + ";declared:" + intent.declaredPaths.join(",") }];
  },
};
