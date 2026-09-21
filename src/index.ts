import type { Plugin } from "@opencode-ai/plugin";
import { loadConfig, type NamingDisciplineConfig } from "./config.ts";
import { buildPolicyContext } from "./context/policy.ts";
import { RuleRegistry } from "./core/rules.ts";
import { namingRule } from "./rules/naming.ts";
import { slopRule } from "./rules/slop.ts";
import { protectedFilesRule } from "./rules/files.ts";
import { changeSurfaceRule, testIntegrityRule } from "./rules/changes.ts";
import { extractChanges } from "./scanners/patch.ts";
import { matchesPath, normalizePath } from "./scanners/paths.ts";

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
  registry.register(changeSurfaceRule);

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
      for (const guard of commandPatterns) {
        guard.regex.lastIndex = 0;
        if (!guard.regex.test(input.command)) continue;
        const message = "[open-disipline] " + (config.mode === "strict" ? "BLOCK" : "WARN") + ": command matches configured guard: " + guard.source;
        if (config.mode === "strict") throw new Error(message);
        console.warn(message);
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