import type { Plugin } from "@opencode-ai/plugin";
import { loadConfig, type NamingDisciplineConfig } from "./config.ts";
import { buildPolicyContext } from "./context/policy.ts";
import { RuleRegistry } from "./core/rules.ts";
import { namingRule } from "./rules/naming.ts";
import { slopRule } from "./rules/slop.ts";
import { protectedFilesRule } from "./rules/files.ts";
import { changeSurfaceRule, testIntegrityRule, testEvidenceRule } from "./rules/changes.ts";
import { extractChanges } from "./scanners/patch.ts";
import { matchesPath, normalizePath } from "./scanners/paths.ts";
import { suppressionRule } from "./rules/suppressions.ts";
import { guardShellCommand, isValidationCommand, validationKey, validationPassed } from "./runtime/command.ts";
import { createSessionState } from "./runtime/session-state.ts";

const FILE_TOOLS = new Set(["write", "edit", "apply_patch"]);
const CORE_INTEGRITY_PATHS = [
  "discipline.config.json",
  "src/index.ts",
  "src/config.ts",
  "src/core/**",
  "src/rules/**",
  "src/scanners/**",
  ".opencode/plugins/open-disipline.ts",
];

function isCoreIntegrityPath(path: string): boolean {
  return matchesPath(path, CORE_INTEGRITY_PATHS);
}

export const OpenDisipline: Plugin = async ({ directory, client }) => {
  const config: NamingDisciplineConfig = await loadConfig(directory);
  const registry = new RuleRegistry();
  registry.register(protectedFilesRule);
  registry.register(namingRule);
  registry.register(slopRule);
  registry.register(testIntegrityRule);
  registry.register(testEvidenceRule);
  registry.register(suppressionRule);
  registry.register(changeSurfaceRule);

  const sessionStates = new Map<string, ReturnType<typeof createSessionState>>();
  const getState = (sessionID: string) => {
    let state = sessionStates.get(sessionID);
    if (!state) {
      state = createSessionState();
      sessionStates.set(sessionID, state);
    }
    return state;
  };

  const commandPatterns = config.commandGuards.flatMap((source) => {
    try { return [{ source, regex: new RegExp(source) }]; }
    catch { console.warn("[open-disipline] Invalid command guard skipped: " + source); return []; }
  });

  return {
    "experimental.chat.messages.transform": async (_input, output) => {
      if (!config.enabled || !config.context.enabled || !output.messages.length) return;
      const firstUser = output.messages.find((message) => message.info.role === "user");
      if (!firstUser || !firstUser.parts.length) return;
      if (firstUser.parts.some((part) => part.type === "text" && part.text.includes("[Open Disipline engineering policy]"))) return;
      const context = buildPolicyContext(config);
      if (!context) return;
      const firstText = firstUser.parts.find((part) => part.type === "text");
      if (!firstText) return;

      firstUser.parts.unshift({
        ...firstText,
        text: context,
      });
    },

    "tool.execute.before": async (input, output) => {
      if (!config.enabled || !FILE_TOOLS.has(input.tool)) return;
      const changes = extractChanges(input.tool, output.args as Record<string, unknown>);
      if (!changes.length) return;
      const guarded = changes.filter((change) => !matchesPath(change.filePath, config.allow.paths));
      const integrityChange = guarded.find((change) => isCoreIntegrityPath(change.filePath));
      if (integrityChange) {
        throw new Error("[open-disipline] BLOCK: guardrail implementation/configuration is protected from agent modification: " + integrityChange.filePath);
      }
      const files = [...new Set(guarded.map((change) => normalizePath(change.filePath)))];
      const testFiles = files.filter((file) => config.testIntegrity.paths.some((pattern) => matchesPath(file, [pattern])));
      const codeFiles = files.filter((file) => config.codeFileExtensions.includes(file.slice(file.lastIndexOf("."))));
      const findings = [];
      for (let index = 0; index < guarded.length; index++) {
        const change = guarded[index]!;
        findings.push(...registry.runAll({
          filePath: change.filePath,
          addedText: change.addedText,
          removedText: change.removedText,
          deleted: change.deleted,
          config,
          changeFiles: files,
          testFiles,
          codeFiles,
          changeIndex: index,
        }));
      }
      const blocking = findings.filter((finding) => finding.severity === "block");
      const warnings = findings.filter((finding) => finding.severity === "warn");
      for (const warning of warnings) console.warn("[open-disipline] " + warning.rule + "\n" + warning.message);
      if (blocking.length) throw new Error(blocking.map((finding) => finding.message).join("\n\n---\n\n"));
    },

    "command.execute.before": async (input) => {
      if (!config.enabled) return;
      const state = getState(input.sessionID);

      const destructive = guardShellCommand(input.command, CORE_INTEGRITY_PATHS);
      if (destructive) {
        const message = "[open-disipline] " + destructive.severity.toUpperCase() + ": " + destructive.message;
        if (destructive.severity === "block" && config.mode === "strict") throw new Error(message);
        console.warn(message);
      }

      for (const guard of commandPatterns) {
        guard.regex.lastIndex = 0;
        if (!guard.regex.test(input.command)) continue;
        const message = "[open-disipline] " + (config.mode === "strict" ? "BLOCK" : "WARN") + ": command matches configured guard: " + guard.source;
        if (config.mode === "strict") throw new Error(message);
        console.warn(message);
      }

      if (!isValidationCommand(input.command)) return;
      state.validationAttempted++;
      const key = validationKey(input.command);
      if (state.lastValidationKey === key) state.repeatedValidation++;
      else state.repeatedValidation = 0;
      state.lastValidationKey = key;
    },

    "event": async ({ event }) => {
      const type = (event as { type?: string }).type ?? "";
      if (type !== "command.executed") return;
      const payload = event as { properties?: Record<string, unknown> };
      const command = typeof payload.properties?.command === "string" ? payload.properties.command : "";
      if (!command || !isValidationCommand(command)) return;
      const sessionID = typeof payload.properties?.sessionID === "string" ? payload.properties.sessionID : "";
      if (!sessionID) return;
      const state = getState(sessionID);
      if (validationPassed(payload.properties)) {
        state.validationPassed++;
        state.failureRepeats = 0;
        state.lastFailureKey = undefined;
      } else {
        state.validationFailed++;
        const key = validationKey(command);
        if (state.lastFailureKey === key) state.failureRepeats++;
        else state.failureRepeats = 1;
        state.lastFailureKey = key;
        if (state.failureRepeats >= 3) {
          console.warn("[open-disipline] Repeated validation failure detected. Stop changing unrelated code and inspect the original failure/root cause before retrying.");
        }
      }
    },

    "permission.ask": async (input, output) => {
      if (!config.enabled || !config.readProtection.enabled || input.type !== "read") return;

      const path = typeof input.pattern === "string" ? input.pattern : "";

      if (
        !path ||
        !matchesPath(path, config.readProtection.paths) ||
        matchesPath(path, config.readProtection.allowPaths)
      ) {
        return;
      }
      output.status = "deny";
      try { await client.app.log({ body: { service: "open-disipline", level: "warn", message: "Blocked protected-file read", extra: { path } } }); } catch {}
    },
  };
};

export default OpenDisipline;