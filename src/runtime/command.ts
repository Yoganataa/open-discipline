import { normalizePath } from "../scanners/paths.ts";

export interface CommandFinding {
  severity: "block" | "warn";
  rule: string;
  message: string;
}

const MUTATING_PROTECTED_RE = /(?:>|>>|\b(?:tee|set-content|out-file|add-content|sed\s+-i|perl\s+-pi|mv|move|cp|copy|robocopy|xcopy)\b)/i;

function mentionsProtected(command: string, protectedPaths: string[]): string | undefined {
  const normalized = normalizePath(command).toLowerCase().replace(/[\"']/g, " ");
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return protectedPaths.find((path) => {
    const base = normalizePath(path).toLowerCase().replace(/\/\*\*$/, "").replace(/\/\*$/, "");
    if (!base) return false;
    return tokens.some((token) => token === base || token === base + "/" || token.startsWith(base + "/"));
  });
}

export function guardShellCommand(command: string, protectedPaths: string[]): CommandFinding | undefined {
  const raw = command.trim();
  const c = raw.replace(/[\r\n]+/g, " ");
  const lower = c.toLowerCase();

  if (/\bgit\s+(?:reset\s+--hard|clean\s+-[a-z]*f[a-z]*|restore\s+(?:--source\s+\S+\s+)?(?:\.|\/|\\\*)|checkout\s+--\s+(?:\.|\/|\\\*))\b/i.test(c)) {
    return {
      severity: "block",
      rule: "command:destructive-git",
      message: "Destructive Git command blocked because it can discard uncommitted work.",
    };
  }

  if (/\bgit\s+push\b[^\n]*\s(?:-f|--force|--force-with-lease)\b/i.test(c)) {
    return {
      severity: "block",
      rule: "command:force-push",
      message: "Force-push command blocked. Preserve remote history unless a human explicitly performs the operation.",
    };
  }

  if (/(?:^|[;&|])\s*(?:rm\s+-[a-z]*rf|rmdir\s+\/s|del\s+\/s\s+\/q|remove-item\b[^\n]*\-(?:recurse|force))/i.test(c)) {
    const absoluteRoot = /\brm\s+-[a-z]*rf\s+(?:\/|~\/?|\.\.?\/?(?:\s|$))/i.test(c);
    const protectedPath = mentionsProtected(c, protectedPaths);
    if (absoluteRoot || protectedPath) {
      return {
        severity: "block",
        rule: "command:destructive-delete",
        message: protectedPath
          ? `Destructive command would modify or delete a protected path: ${protectedPath}`
          : "Destructive recursive delete blocked at a repository/root boundary.",
      };
    }
    return {
      severity: "warn",
      rule: "command:recursive-delete",
      message: "Recursive delete command detected. Verify the target before executing it.",
    };
  }

  const protectedPath = mentionsProtected(c, protectedPaths);
  if (protectedPath && MUTATING_PROTECTED_RE.test(c)) {
    return {
      severity: "block",
      rule: "command:protected-path-write",
      message: `Shell command appears to modify a protected OpenDisipline path: ${protectedPath}`,
    };
  }

  if (/\b(?:find|fd)\b[^\n]*\s-delete\b/i.test(c)) {
    return {
      severity: "block",
      rule: "command:bulk-delete",
      message: "Bulk file deletion command blocked. Use targeted file operations instead.",
    };
  }

  return undefined;
}

const VALIDATION_PATTERNS = [
  /\b(?:npm|pnpm|yarn|bun)\s+(?:test|run\s+(?:test|typecheck|lint|check|build))\b/i,
  /\b(?:pytest|mypy|pyright|ruff|tox)\b/i,
  /\b(?:go\s+test|go\s+vet|golangci-lint)\b/i,
  /\b(?:cargo\s+(?:test|check|clippy))\b/i,
  /\b(?:dotnet\s+(?:test|build|format|validate)|msbuild)\b/i,
  /\b(?:gradle|gradlew|mvn|mvnw)\b[^\n]*(?:test|check|lint|build)\b/i,
  /\b(?:flutter|dart)\b[^\n]*(?:test|analyze|format|build)\b/i,
  /\b(?:swift\s+test|xcodebuild)\b/i,
  /\b(?:cmake|ctest)\b[^\n]*(?:test|build|check)?\b/i,
];

export function isValidationCommand(command: string): boolean {
  return VALIDATION_PATTERNS.some((re) => re.test(command));
}

export function validationKey(command: string): string {
  return command.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 500);
}

