export const EVAL_SCHEMA_VERSION = 1 as const;

export type WorkflowLevel = "L0" | "L1" | "L2" | "L3";
export type EvalMode = "baseline" | "guided";
export type ScenarioKind = "feature" | "bugfix" | "refactor" | "safety" | "memory";

export interface EvidenceRequirement {
  id: string;
  description: string;
  kind: "artifact" | "behavior" | "command" | "repository" | "user-path";
  required: boolean;
  paths?: string[];
}

export interface Scenario {
  schemaVersion: typeof EVAL_SCHEMA_VERSION;
  id: string;
  title: string;
  kind: ScenarioKind;
  workflowLevel: WorkflowLevel;
  objective: string;
  fixture: string;
  pressure: string[];
  requiredBehaviors: string[];
  forbiddenBehaviors: string[];
  evidence: EvidenceRequirement[];
  modes: EvalMode[];
  checks?: ScenarioChecks;
  verifier?: string;
  baselineVerifier?: "pass" | "fail" | "ignore";
}

export interface ScenarioChecks {
  allowedChangedPaths?: string[];
  forbiddenChangedPaths?: string[];
  requiredArtifacts?: string[];
  requiredFiles?: string[];
  requiredCommands?: string[];
  forbiddenCommands?: string[];
}

export interface EvaluationEvidence {
  id: string;
  observed: boolean;
  detail?: string;
}

export interface EvaluationResult {
  schemaVersion: typeof EVAL_SCHEMA_VERSION;
  scenarioID: string;
  mode: EvalMode;
  outcome: "completed" | "failed" | "blocked" | "abandoned" | "unknown";
  evidence: EvaluationEvidence[];
  failures: string[];
  executor?: string;
  model?: string;
}

export function validateScenario(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object") return ["scenario:not-object"];
  const raw = value as Record<string, unknown>;

  if (raw.schemaVersion !== EVAL_SCHEMA_VERSION) errors.push("schemaVersion");
  if (raw.verifier !== undefined && (typeof raw.verifier !== "string" || !raw.verifier)) errors.push("verifier");
  if (raw.baselineVerifier !== undefined && !["pass", "fail", "ignore"].includes(String(raw.baselineVerifier))) errors.push("baselineVerifier");
  for (const key of ["id", "title", "objective", "fixture"] as const) {
    if (typeof raw[key] !== "string" || !raw[key]) errors.push(key);
  }

  if (!["feature", "bugfix", "refactor", "safety", "memory"].includes(String(raw.kind))) errors.push("kind");
  if (!["L0", "L1", "L2", "L3"].includes(String(raw.workflowLevel))) errors.push("workflowLevel");

  for (const key of ["pressure", "requiredBehaviors", "forbiddenBehaviors", "evidence", "modes"] as const) {
    if (!Array.isArray(raw[key]) || raw[key].length === 0) errors.push(key);
  }

  if (Array.isArray(raw.modes)) {
    for (const mode of raw.modes) {
      if (mode !== "baseline" && mode !== "guided") errors.push("modes:" + String(mode));
    }
  }

  if (Array.isArray(raw.evidence)) {
    const ids = new Set<string>();
    for (const item of raw.evidence) {
      if (!item || typeof item !== "object") {
        errors.push("evidence:item");
        continue;
      }
      const entry = item as Record<string, unknown>;
      if (typeof entry.id !== "string" || !entry.id) errors.push("evidence:id");
      if (ids.has(String(entry.id))) errors.push("evidence:duplicate:" + String(entry.id));
      ids.add(String(entry.id));
      if (typeof entry.description !== "string" || !entry.description) errors.push("evidence:description");
      if (!["artifact", "behavior", "command", "repository", "user-path"].includes(String(entry.kind))) errors.push("evidence:kind:" + String(entry.kind));
      if (typeof entry.required !== "boolean") errors.push("evidence:required");
      if (entry.paths !== undefined) {
        if (!Array.isArray(entry.paths) || entry.paths.length === 0 || entry.paths.some(path => typeof path !== "string" || !path)) {
          errors.push("evidence:paths");
        }
      }
      if (entry.kind === "artifact" && entry.paths !== undefined && !Array.isArray(entry.paths)) {
        errors.push("evidence:paths");
      }
    }
  }

  return errors;
}

export function validateEvaluationResult(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object") return ["result:not-object"];
  const raw = value as Record<string, unknown>;

  if (raw.schemaVersion !== EVAL_SCHEMA_VERSION) errors.push("schemaVersion");
  if (typeof raw.scenarioID !== "string" || !raw.scenarioID) errors.push("scenarioID");
  if (raw.mode !== "baseline" && raw.mode !== "guided") errors.push("mode");
  if (!["completed", "failed", "blocked", "abandoned", "unknown"].includes(String(raw.outcome))) errors.push("outcome");
  if (!Array.isArray(raw.evidence)) errors.push("evidence");
  if (!Array.isArray(raw.failures)) errors.push("failures");

  if (Array.isArray(raw.evidence)) {
    const ids = new Set<string>();
    for (const item of raw.evidence) {
      if (!item || typeof item !== "object") {
        errors.push("evidence:item");
        continue;
      }
      const entry = item as Record<string, unknown>;
      if (typeof entry.id !== "string" || !entry.id) errors.push("evidence:id");
      if (ids.has(String(entry.id))) errors.push("evidence:duplicate:" + String(entry.id));
      ids.add(String(entry.id));
      if (typeof entry.observed !== "boolean") errors.push("evidence:observed");
      if (entry.detail !== undefined && typeof entry.detail !== "string") errors.push("evidence:detail");
    }
  }

  return errors;
}

function rawScenarioID(result: EvaluationResult): string {
  return result.scenarioID;
}

export function requiredEvidencePassed(scenario: Scenario, result: EvaluationResult): boolean {
  if (result.scenarioID !== scenario.id) return false;
  if (result.outcome !== "completed") return false;
  if (validateEvaluationResult(result).length > 0) return false;

  const required = scenario.evidence.filter(item => item.required);
  if (required.length === 0) return false;

  const observed = new Set(result.evidence.filter(item => item.observed).map(item => item.id));
  return required.every(item => observed.has(item.id));
}
