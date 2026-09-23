import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";

export const INSTALL_SCHEMA_VERSION = 1 as const;
export const AGENTS_START = "<!-- open-discipline:start -->";
export const AGENTS_END = "<!-- open-discipline:end -->";

export const AGENTS_SECTION = [
  AGENTS_START,
  "## OpenDiscipline",
  "",
  'Use the "open-discipline-workflow" skill for non-trivial implementation work.',
  "",
  "- Choose the smallest justified workflow level; do not add ceremony to trivial edits.",
  "- For L2/L3 work, keep requirements, tasks, and verification evidence traceable.",
  "- Never claim a test or validation passed without observed evidence.",
  "- Never bypass or weaken an OpenDiscipline BLOCK; fix the cause or surface the conflict.",
  "- Treat current repository source and observed runtime evidence as higher-trust than memory or summaries.",
  "- This section supplements existing repository instructions; it does not replace or rewrite them.",
  AGENTS_END,
  "",
].join("\\n");

export function getOpenCodeConfigDir(
  env: NodeJS.ProcessEnv = process.env,
  platform = process.platform,
): string {
  if (env.OPENCODE_CONFIG_DIR) return resolve(env.OPENCODE_CONFIG_DIR);
  if (platform !== "win32" && env.XDG_CONFIG_HOME) {
    return resolve(env.XDG_CONFIG_HOME, "opencode");
  }
  return resolve(env.HOME ?? env.USERPROFILE ?? homedir(), ".config", "opencode");
}

export function getScopeRoot(scope: "global" | "project", cwd = process.cwd()): string {
  return scope === "global" ? getOpenCodeConfigDir() : resolve(cwd, ".opencode");
}

export function getManagedRoot(scope: "global" | "project", cwd = process.cwd()): string {
  return join(getScopeRoot(scope, cwd), "open-discipline");
}

export function getPluginPath(scope: "global" | "project", cwd = process.cwd()): string {
  return join(getScopeRoot(scope, cwd), "plugins", "open-discipline.ts");
}

export function getSkillPath(scope: "global" | "project", cwd = process.cwd()): string {
  return join(getScopeRoot(scope, cwd), "skills", "open-discipline-workflow", "SKILL.md");
}

export function getAgentsPath(scope: "global" | "project", cwd = process.cwd()): string {
  return scope === "global"
    ? join(getScopeRoot(scope, cwd), "AGENTS.md")
    : resolve(cwd, "AGENTS.md");
}

export function mergeAgentsSection(
  original: string,
): { content: string; changed: boolean; previousSection?: string } {
  const start = original.indexOf(AGENTS_START);
  const end = original.indexOf(AGENTS_END);

  if ((start === -1) !== (end === -1) || (start !== -1 && end < start)) {
    throw new Error("AGENTS.md contains an incomplete or malformed OpenDiscipline section.");
  }

  const newline = original.includes("\\r\\n") ? "\\r\\n" : "\\n";
  const section = AGENTS_SECTION.replaceAll("\\n", newline);

  if (start !== -1 && end !== -1) {
    const endExclusive = end + AGENTS_END.length;
    const previousSection = original.slice(start, endExclusive);
    return {
      content: original.slice(0, start) + section + original.slice(endExclusive),
      changed: previousSection !== section,
      previousSection,
    };
  }

  const base = original.trimEnd();
  if (!base) return { content: section, changed: original !== section };
  return {
    content:
      base +
      newline +
      newline +
      section +
      (original.endsWith(newline) ? "" : newline),
    changed: true,
  };
}

export function removeAgentsSection(original: string, expectedSection?: string): {
  content: string;
  changed: boolean;
  remainingOnlyWhitespace: boolean;
} {
  const start = original.indexOf(AGENTS_START);
  const end = original.indexOf(AGENTS_END);

  if (start === -1 && end === -1) {
    return { content: original, changed: false, remainingOnlyWhitespace: original.trim().length === 0 };
  }
  if ((start === -1) !== (end === -1) || end < start) {
    throw new Error("AGENTS.md contains an incomplete or malformed OpenDiscipline section.");
  }

  const endExclusive = end + AGENTS_END.length;
  const currentSection = original.slice(start, endExclusive);
  if (expectedSection && currentSection !== expectedSection) {
    throw new Error(
      "The OpenDiscipline AGENTS.md section was changed after installation. " +
        "Refusing to overwrite user edits; inspect the section manually or use an explicit repair.",
    );
  }

  const before = original.slice(0, start).replace(/[ \\t]+$/gm, "");
  const after = original.slice(endExclusive).replace(/^[ \\t]+/gm, "");
  const separator = before && after ? (original.includes("\\r\\n") ? "\\r\\n\\r\\n" : "\\n\\n") : "";
  const content = before + separator + after;
  return {
    content,
    changed: content !== original,
    remainingOnlyWhitespace: content.trim().length === 0,
  };
}

export function hashText(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function buildPluginLoader(_scope: "global" | "project"): string {
  return [
    "/* open-discipline:managed */",
    "/* Do not edit manually; managed by the OpenDiscipline GitHub installer. */",
    'export { default } from "../open-discipline/src/index.ts";',
    "",
  ].join("\\n");
}

export function managedMarkerPresent(value: string): boolean {
  return value.includes("open-discipline:managed");
}

export function getRelativeInstallSource(scriptFile: string): string {
  return resolve(dirname(scriptFile), "..");
}
