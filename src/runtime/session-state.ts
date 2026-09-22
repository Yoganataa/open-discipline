export interface SessionState {
  changed: boolean;
  codeChanged: boolean;
  testChanged: boolean;
  validationAttempted: number;
  validationPassed: number;
  validationFailed: number;
  lastValidationKey?: string;
  repeatedValidation: number;
  lastFailureKey?: string;
  failureRepeats: number;
  completionWarned: boolean;
}

export function createSessionState(): SessionState {
  return {
    changed: false,
    codeChanged: false,
    testChanged: false,
    validationAttempted: 0,
    validationPassed: 0,
    validationFailed: 0,
    repeatedValidation: 0,
    failureRepeats: 0,
    completionWarned: false,
  };
}
