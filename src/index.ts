import type { Plugin } from "@opencode-ai/plugin";
import { loadConfig, type NamingDisciplineConfig } from "./config.ts";
import { buildPolicyContext } from "./context/policy.ts";
import { RuleRegistry } from "./core/rules.ts";
import { namingRule } from "./rules/naming.ts";
import { slopRule } from "./rules/slop.ts";
import { protectedFilesRule } from "./rules/files.ts";
import { changeSurfaceRule, testIntegrityRule } from "./rules/changes.ts";
import { extractChanges } from "./scanners/patch.ts";
import { matchesPath } from "./scanners/paths.ts";

const FILE_TOOLS = new Set(["write", "edit", "apply_patch"]);

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
    "experimental.chat.system.transform": async (input, output) => {
      if (!config.enabled || !config.context.enabled) return;
      // V1.18.x does not expose parentID directly in this hook. Avoid the
      // old heuristic of parsing session IDs: it is not a stable contract.
      // Users can opt into child-session context when needed.
      if (!config.context.includeOnSubsessions && input.sessionID) return;
      const context = buildPolicyContext(config);
      if (context) output.system.push(context);
    },

    "tool.execute.before": async (input, output) => {
      if (!config.enabled || !FILE_TOOLS.has(input.tool)) return;
      const changes = extractChanges(input.tool, output.args as Record<string, unknown>);
      if (!changes.length) return;
      const files = [...new Set(changes.map((change) => change.filePath))];
      const findings = [];
      for (const change of changes) {
        if (matchesPath(change.filePath, config.allow.paths)) continue;
        findings.push(...registry.runAll({ filePath: change.filePath, addedText: change.addedText, config, changeFiles: files }));
      }
      const blocking = findings.filter((finding) => finding.severity === "block");
      const warnings = findings.filter((finding) => finding.severity === "warn");
      for (const warning of warnings) console.warn("[open-disipline] " + warning.rule + "\n" + warning.message);
      if (blocking.length) throw new Error(blocking.map((finding) => finding.message).join("\n\n---\n\n"));
    },

    "command.execute.before": async (input) => {
      if (!config.enabled) return;
      for (const guard of commandPatterns) {
        if (!guard.regex.test(input.command)) continue;
        const message = "[open-disipline] " + (config.mode === "strict" ? "BLOCK" : "WARN") + ": command matches configured guard: " + guard.source;
        if (config.mode === "strict") throw new Error(message);
        console.warn(message);
      }
    },

    "permission.ask": async (input, output) => {
      if (!config.enabled || !config.readProtection.enabled) return;
      if (input.type !== "read") return;
      const pattern = typeof input.patterns?.[0] === "string" ? input.patterns[0] : "";
      if (!pattern || !matchesPath(pattern, config.readProtection.paths) || matchesPath(pattern, config.readProtection.allowPaths)) return;
      output.status = "deny";
      try { await client.app.log({ body: { service: "open-disipline", level: "warn", message: "Blocked protected-file read", extra: { path: pattern } } }); } catch {}
    },
  };
};

export default OpenDisipline;