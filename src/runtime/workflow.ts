export const WORKFLOW_SCHEMA_VERSION = 1 as const;

export type WorkflowLevel = "L0" | "L1" | "L2" | "L3";
export type WorkflowStatus = "proposed" | "active" | "blocked" | "verifying" | "review" | "complete";
export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type VerificationKind = "test" | "static" | "runtime" | "user";

export interface WorkflowRequirement {
  id: string;
  statement: string;
  acceptance: string[];
}

export interface WorkflowTask {
  id: string;
  title: string;
  requirements: string[];
  status: TaskStatus;
  files: string[];
  verification: string[];
}

export interface WorkflowVerification {
  id: string;
  taskIDs: string[];
  kind: VerificationKind;
  command?: string;
  observed: boolean;
  evidence?: string;
}

export interface WorkflowState {
  schemaVersion: typeof WORKFLOW_SCHEMA_VERSION;
  workflowID: string;
  level: WorkflowLevel;
  status: WorkflowStatus;
  objective: string;
  requirements: WorkflowRequirement[];
  tasks: WorkflowTask[];
  verifications: WorkflowVerification[];
  updatedAt: string;
}

export interface WorkflowValidationIssue {
  code:
    | "duplicate-id"
    | "missing-requirement"
    | "missing-task"
    | "missing-verification"
    | "unobserved-verification"
    | "incomplete-task"
    | "invalid-state";
  message: string;
  path: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  issues: WorkflowValidationIssue[];
}

const LEVELS: WorkflowLevel[] = ["L0", "L1", "L2", "L3"];
const STATUSES: WorkflowStatus[] = ["proposed", "active", "blocked", "verifying", "review", "complete"];
const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];
const VERIFICATION_KINDS: VerificationKind[] = ["test", "static", "runtime", "user"];

function unique(values: string[]): Set<string> {
  return new Set(values);
}

export function validateWorkflowState(state: WorkflowState): WorkflowValidationResult {
  const issues: WorkflowValidationIssue[] = [];

  if (
    state.schemaVersion !== WORKFLOW_SCHEMA_VERSION ||
    !state.workflowID ||
    !state.objective ||
    !LEVELS.includes(state.level) ||
    !STATUSES.includes(state.status)
  ) {
    issues.push({
      code: "invalid-state",
      message: "Workflow state is missing required identity fields or uses an unsupported schema/value.",
      path: "$",
    });
    return { valid: false, issues };
  }

  const requirementIDs = state.requirements.map((item) => item.id);
  const taskIDs = state.tasks.map((item) => item.id);
  const verificationIDs = state.verifications.map((item) => item.id);

  for (const [label, ids, path] of [
    ["requirement", requirementIDs, "requirements"],
    ["task", taskIDs, "tasks"],
    ["verification", verificationIDs, "verifications"],
  ] as const) {
    if (unique(ids).size !== ids.length) {
      issues.push({
        code: "duplicate-id",
        message: "Duplicate " + label + " IDs are not allowed.",
        path,
      });
    }
  }

  const requirementSet = new Set(requirementIDs);
  const taskSet = new Set(taskIDs);
  const verificationSet = new Set(verificationIDs);

  for (let i = 0; i < state.tasks.length; i += 1) {
    const task = state.tasks[i]!;
    if (!task.id || !task.title || !TASK_STATUSES.includes(task.status)) {
      issues.push({
        code: "invalid-state",
        message: "Task has missing identity or unsupported status.",
        path: "tasks[" + i + "]",
      });
    }

    for (const requirementID of task.requirements) {
      if (!requirementSet.has(requirementID)) {
        issues.push({
          code: "missing-requirement",
          message: "Task " + task.id + " references unknown requirement " + requirementID + ".",
          path: "tasks[" + i + "].requirements",
        });
      }
    }

    for (const verificationID of task.verification) {
      if (!verificationSet.has(verificationID)) {
        issues.push({
          code: "missing-verification",
          message: "Task " + task.id + " references unknown verification " + verificationID + ".",
          path: "tasks[" + i + "].verification",
        });
      }
    }

    if (task.status === "done" && task.verification.length === 0) {
      issues.push({
        code: "incomplete-task",
        message: "Task " + task.id + " cannot be done without verification references.",
        path: "tasks[" + i + "]",
      });
    }
  }

  for (let i = 0; i < state.verifications.length; i += 1) {
    const verification = state.verifications[i]!;
    if (!verification.id || !VERIFICATION_KINDS.includes(verification.kind)) {
      issues.push({
        code: "invalid-state",
        message: "Verification has missing identity or unsupported kind.",
        path: "verifications[" + i + "]",
      });
    }

    for (const taskID of verification.taskIDs) {
      if (!taskSet.has(taskID)) {
        issues.push({
          code: "missing-task",
          message: "Verification " + verification.id + " references unknown task " + taskID + ".",
          path: "verifications[" + i + "].taskIDs",
        });
      }
    }

    if (verification.observed && !verification.evidence) {
      issues.push({
        code: "invalid-state",
        message: "Observed verification " + verification.id + " must carry explicit evidence.",
        path: "verifications[" + i + "]",
      });
    }
  }

  if (state.status === "complete") {
    if (state.level !== "L0" && state.requirements.length === 0) {
      issues.push({
        code: "invalid-state",
        message: "Workflow levels L1-L3 require at least one requirement before completion.",
        path: "requirements",
      });
    }

    for (let i = 0; i < state.tasks.length; i += 1) {
      const task = state.tasks[i]!;
      if (task.status !== "done") {
        issues.push({
          code: "incomplete-task",
          message: "Workflow cannot be complete while task " + task.id + " is " + task.status + ".",
          path: "tasks[" + i + "].status",
        });
        continue;
      }

      const observed = task.verification
        .map((id) => state.verifications.find((item) => item.id === id))
        .filter((item): item is WorkflowVerification => Boolean(item?.observed));

      if (observed.length === 0) {
        issues.push({
          code: "unobserved-verification",
          message: "Completed task " + task.id + " has no observed verification evidence.",
          path: "tasks[" + i + "].verification",
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

const ALLOWED_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  proposed: ["active", "blocked"],
  active: ["blocked", "verifying"],
  blocked: ["active"],
  verifying: ["active", "review", "blocked"],
  review: ["active", "complete", "blocked"],
  complete: [],
};

export function canTransitionWorkflow(from: WorkflowStatus, to: WorkflowStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionWorkflow(state: WorkflowState, to: WorkflowStatus): WorkflowState {
  if (!canTransitionWorkflow(state.status, to)) {
    throw new Error("Invalid workflow transition: " + state.status + " -> " + to);
  }

  return {
    ...state,
    status: to,
    updatedAt: new Date().toISOString(),
  };
}
