import type { TaskIntent } from "./intent.ts";
export interface SessionState {
  changed: boolean;
  codeChanged: boolean;
  testChanged: boolean;
  validationAttempted: number;
  lastValidationKey?: string;
  repeatedValidation: number;
  completionWarned: boolean;
  taskIntent?:TaskIntent;
}

export function createSessionState(): SessionState {
  return {
    changed: false,
    codeChanged: false,
    testChanged: false,
    validationAttempted: 0,
    repeatedValidation: 0,
    completionWarned: false,
  };
}
