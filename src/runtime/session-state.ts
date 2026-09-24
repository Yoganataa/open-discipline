import type { TaskIntent } from "./intent.ts";

export interface SessionState {
  changed: boolean;
  codeChanged: boolean;
  testChanged: boolean;
  affectedFiles: Set<string>;
  validationAttempted: number;
  lastValidationKey?: string;
  repeatedValidation: number;
  completionWarned: boolean;
  taskIntent?:TaskIntent;
  regressionTestEvidenceSeen: boolean;
  memoryLoaded: boolean;
}

export function createSessionState(): SessionState {
  return {
    changed: false,
    codeChanged: false,
    testChanged: false,
    affectedFiles: new Set<string>(),
    validationAttempted: 0,
    repeatedValidation: 0,
    completionWarned: false,
    regressionTestEvidenceSeen: false,
    memoryLoaded: false,
  };
}
