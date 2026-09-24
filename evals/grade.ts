import {
  requiredEvidencePassed,
  type EvaluationResult,
  type Scenario,
} from "./contract.ts";

export type BaselineGrade =
  | "expected-failure"
  | "pass"
  | "unexpected-pass"
  | "unexpected-failure"
  | "unknown";

export type GuidedGrade = "pass" | "fail" | "unknown";

export type ComparisonGrade =
  | "demonstrated"
  | "baseline-invalid"
  | "guided-failed"
  | "inconclusive";

export interface BehavioralGrade {
  scenarioID: string;
  baseline: BaselineGrade;
  guided: GuidedGrade;
  comparison: ComparisonGrade;
}

function verifierObserved(result: EvaluationResult): boolean | undefined {
  const evidence = result.evidence.find((item) => item.id === "verifier");
  return evidence?.observed;
}

export function gradeBaseline(
  scenario: Scenario,
  result: EvaluationResult,
): BaselineGrade {
  if (result.scenarioID !== scenario.id || result.mode !== "baseline") {
    return "unknown";
  }

  if (scenario.baselineVerifier === "ignore") {
    return "unknown";
  }

  if (!scenario.baselineVerifier) {
    return "unknown";
  }

  const observed = verifierObserved(result);
  if (observed === undefined) {
    return "unknown";
  }

  if (scenario.baselineVerifier === "pass") {
    return observed ? "pass" : "unexpected-failure";
  }

  return observed ? "unexpected-pass" : "expected-failure";
}

export function gradeGuided(
  scenario: Scenario,
  result: EvaluationResult,
): GuidedGrade {
  if (result.scenarioID !== scenario.id || result.mode !== "guided") {
    return "unknown";
  }

  if (result.outcome === "failed" || result.outcome === "blocked" || result.outcome === "abandoned") {
    return "fail";
  }

  if (result.outcome !== "completed") {
    return "unknown";
  }

  return requiredEvidencePassed(scenario, result) ? "pass" : "unknown";
}

export function compareBehavioralRuns(
  scenario: Scenario,
  baseline: EvaluationResult,
  guided: EvaluationResult,
): BehavioralGrade {
  const baselineGrade = gradeBaseline(scenario, baseline);
  const guidedGrade = gradeGuided(scenario, guided);

  let comparison: ComparisonGrade;
  if (baselineGrade === "expected-failure" && guidedGrade === "pass") {
    comparison = "demonstrated";
  } else if (baselineGrade === "unexpected-pass") {
    comparison = "baseline-invalid";
  } else if (guidedGrade === "fail") {
    comparison = "guided-failed";
  } else {
    comparison = "inconclusive";
  }

  return {
    scenarioID: scenario.id,
    baseline: baselineGrade,
    guided: guidedGrade,
    comparison,
  };
}
