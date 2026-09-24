import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { TaskIntent } from "./intent.ts";
import type { SessionState } from "./session-state.ts";

export const MEMORY_SCHEMA_VERSION = 1 as const;

export type MemoryStatus = "active" | "stale" | "superseded" | "invalid";
export type MemorySource = "source" | "validation" | "task-artifact" | "project-doc" | "generated-summary" | "conversation";

export interface ValidationCheckpoint {
  command: string;
  attempts: number;
  result: "attempted" | "unknown";
}

export interface MemoryDecision {
  id: string;
  statement: string;
  status: MemoryStatus;
  source: MemorySource;
  evidence?: string[];
}

export interface TaskCheckpoint {
  schemaVersion: typeof MEMORY_SCHEMA_VERSION;
  sessionID: string;
  objective?: string;
  taskIntent?: TaskIntent;
  activeTask?: string;
  completedTasks: string[];
  blockedTasks: string[];
  decisions: MemoryDecision[];
  affectedFiles: string[];
  validation: ValidationCheckpoint[];
  nextMove?: string;
  updatedAt: string;
}

function stateBase(): string {
  if (process.env.XDG_STATE_HOME) return process.env.XDG_STATE_HOME;
  if (process.platform === "win32") {
    return process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
  }
  return join(homedir(), ".local", "state");
}

function projectKey(directory: string): string {
  return createHash("sha256").update(directory).digest("hex").slice(0, 24);
}

function sessionKey(sessionID: string): string {
  return createHash("sha256").update(sessionID).digest("hex").slice(0, 24);
}

export function getCheckpointPath(directory: string, sessionID: string): string {
  return join(
    stateBase(),
    "opencode",
    "open-discipline",
    "sessions",
    projectKey(directory),
    sessionKey(sessionID) + ".json",
  );
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function parseTaskCheckpoint(value: unknown): TaskCheckpoint | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  if (raw.schemaVersion !== MEMORY_SCHEMA_VERSION || typeof raw.sessionID !== "string" || !raw.sessionID) return undefined;
  if (!Array.isArray(raw.decisions) || !Array.isArray(raw.validation)) return undefined;

  const decisions: MemoryDecision[] = [];
  for (const item of raw.decisions) {
    if (!item || typeof item !== "object") return undefined;
    const decision = item as Record<string, unknown>;
    if (
      typeof decision.id !== "string" ||
      typeof decision.statement !== "string" ||
      !["active", "stale", "superseded", "invalid"].includes(String(decision.status)) ||
      !["source", "validation", "task-artifact", "project-doc", "generated-summary", "conversation"].includes(String(decision.source))
    ) return undefined;
    decisions.push({
      id: decision.id,
      statement: decision.statement,
      status: decision.status as MemoryStatus,
      source: decision.source as MemorySource,
      evidence: stringArray(decision.evidence),
    });
  }

  const validation: ValidationCheckpoint[] = [];
  for (const item of raw.validation) {
    if (!item || typeof item !== "object") return undefined;
    const entry = item as Record<string, unknown>;
    if (
      typeof entry.command !== "string" ||
      typeof entry.attempts !== "number" ||
      !Number.isInteger(entry.attempts) ||
      entry.attempts < 1 ||
      !["attempted", "unknown"].includes(String(entry.result))
    ) return undefined;
    validation.push({
      command: entry.command,
      attempts: entry.attempts,
      result: entry.result as ValidationCheckpoint["result"],
    });
  }

  return {
    schemaVersion: MEMORY_SCHEMA_VERSION,
    sessionID: raw.sessionID,
    objective: typeof raw.objective === "string" ? raw.objective : undefined,
    taskIntent: raw.taskIntent && typeof raw.taskIntent === "object" ? raw.taskIntent as TaskIntent : undefined,
    activeTask: typeof raw.activeTask === "string" ? raw.activeTask : undefined,
    completedTasks: stringArray(raw.completedTasks),
    blockedTasks: stringArray(raw.blockedTasks),
    decisions,
    affectedFiles: stringArray(raw.affectedFiles),
    validation,
    nextMove: typeof raw.nextMove === "string" ? raw.nextMove : undefined,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date(0).toISOString(),
  };
}

export function checkpointFromSessionState(sessionID: string, state: SessionState, now = new Date()): TaskCheckpoint {
  const validation: ValidationCheckpoint[] = state.lastValidationKey
    ? [{
        command: state.lastValidationKey,
        attempts: Math.max(1, state.validationAttempted),
        result: "attempted",
      }]
    : [];

  return {
    schemaVersion: MEMORY_SCHEMA_VERSION,
    sessionID,
    objective: state.taskIntent?.text,
    taskIntent: state.taskIntent,
    completedTasks: [],
    blockedTasks: [],
    decisions: [],
    affectedFiles: [...state.affectedFiles],
    validation,
    updatedAt: now.toISOString(),
  };
}

export function mergeCheckpointIntoSessionState(checkpoint: TaskCheckpoint, state: SessionState): SessionState {
  if (checkpoint.sessionID !== state.taskIntent?.sessionID && checkpoint.taskIntent?.sessionID) {
    state.taskIntent = checkpoint.taskIntent;
  } else if (!state.taskIntent && checkpoint.taskIntent) {
    state.taskIntent = checkpoint.taskIntent;
  }
  state.validationAttempted = Math.max(state.validationAttempted, checkpoint.validation.reduce((sum, entry) => sum + entry.attempts, 0));
  const last = checkpoint.validation.at(-1);
  if (last) state.lastValidationKey = last.command;
  return state;
}

export async function loadTaskCheckpoint(directory: string, sessionID: string): Promise<TaskCheckpoint | undefined> {
  try {
    const text = await readFile(getCheckpointPath(directory, sessionID), "utf8");
    return parseTaskCheckpoint(JSON.parse(text));
  } catch {
    return undefined;
  }
}

export async function saveTaskCheckpoint(directory: string, checkpoint: TaskCheckpoint): Promise<void> {
  const path = getCheckpointPath(directory, checkpoint.sessionID);
  const temp = path + ".tmp-" + process.pid;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temp, JSON.stringify(checkpoint, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
  await rename(temp, path);
}

export function markDecisionStale(decision: MemoryDecision): MemoryDecision {
  return { ...decision, status: decision.status === "active" ? "stale" : decision.status };
}

export function isAuthoritativeSource(source: MemorySource): boolean {
  return source === "source" || source === "validation";
}

const MEMORY_TRUST_WARNING =
  "Memory is a checkpoint, not proof of current repository state. Verify current source and runtime evidence before relying on it.";

export function formatCheckpointContext(checkpoint: TaskCheckpoint, maxCharacters = 6000): string {
  if (maxCharacters <= 0) return "";

  const lines = [
    "[OpenDiscipline task checkpoint]",
    checkpoint.objective ? "Objective: " + checkpoint.objective : "Objective: (not recorded)",
    checkpoint.activeTask ? "Active task: " + checkpoint.activeTask : "Active task: (not recorded)",
    checkpoint.completedTasks.length ? "Completed tasks: " + checkpoint.completedTasks.join(", ") : "Completed tasks: (none recorded)",
    checkpoint.blockedTasks.length ? "Blocked tasks: " + checkpoint.blockedTasks.join(", ") : "Blocked tasks: (none recorded)",
    checkpoint.affectedFiles.length ? "Affected files: " + checkpoint.affectedFiles.join(", ") : "Affected files: (none recorded)",
    checkpoint.validation.length ? "Validation attempts: " + checkpoint.validation.map(v => v.command + " (" + v.attempts + ", " + v.result + ")").join("; ") : "Validation attempts: (none recorded)",
    checkpoint.decisions.filter(d => d.status === "active").length
      ? "Active decisions: " + checkpoint.decisions.filter(d => d.status === "active").map(d => d.statement).join("; ")
      : "Active decisions: (none recorded)",
    checkpoint.nextMove ? "Next move: " + checkpoint.nextMove : "Next move: (not recorded)",
  ];

  const body = lines.join("\n");
  if (body.length <= maxCharacters) {
    const full = body + "\n" + MEMORY_TRUST_WARNING;
    if (full.length <= maxCharacters) return full;
  }

  if (maxCharacters <= MEMORY_TRUST_WARNING.length) {
    return MEMORY_TRUST_WARNING.slice(0, maxCharacters);
  }

  const bodyBudget = maxCharacters - MEMORY_TRUST_WARNING.length - 2;
  if (body.length <= bodyBudget) {
    return body + "\n" + MEMORY_TRUST_WARNING;
  }

  const truncatedBody = bodyBudget > 0
    ? body.slice(0, Math.max(0, bodyBudget - 1)) + "…"
    : "";
  return truncatedBody + "\n" + MEMORY_TRUST_WARNING;
}
