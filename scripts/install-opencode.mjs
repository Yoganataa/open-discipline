#!/usr/bin/env bun
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, cpSync, readdirSync, statSync } from "node:fs";
import {
  AGENTS_END, AGENTS_START, getAgentsPath, getManagedRoot, getPluginPath, getSkillPath,
  hashText, managedMarkerPresent, mergeAgentsSection, removeAgentsSection, managedSectionHash,
} from "./installer-lib.mjs";

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPOSITORY = "https://github.com/Yoganataa/open-discipline";
const DEFAULT_REF = "maturity-hardening";
const args = process.argv.slice(2);
const command = args[0] && !args[0].startsWith("-") ? args[0] : "install";
const scope = args.includes("--local") || args.includes("--scope=project") ? "project" : "global";
const keepAgents = !args.includes("--no-agents");
const refArg = args.find((arg) => arg.startsWith("--ref="));
const requestedRef = refArg ? refArg.slice("--ref=".length) : DEFAULT_REF;

function paths() {
  return {
    managedRoot: resolve(getManagedRoot(scope)),
    plugin: resolve(getPluginPath(scope)),
    skill: resolve(getSkillPath(scope)),
    agents: resolve(getAgentsPath(scope)),
  };
}
function atomicWrite(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = path + ".tmp-" + process.pid;
  writeFileSync(temp, content, "utf8");
  renameSync(temp, path);
}
function backupFile(path, backupDir) {
  if (!existsSync(path)) return null;
  mkdirSync(backupDir, { recursive: true });
  const target = join(backupDir, path.split(/[\\/]/).pop());
  cpSync(path, target, { recursive: true, force: true });
  return target;
}
function readManifest(root) {
  const path = join(root, "install-manifest.json");
  if (!existsSync(path)) return undefined;
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch { throw new Error("Invalid OpenDiscipline install manifest: " + path); }
}
function assertOwnedRoot(root) {
  if (!existsSync(root)) return;
  const manifest = readManifest(root);
  if (!manifest || manifest.repository !== REPOSITORY || manifest.schemaVersion !== 1) {
    throw new Error("Refusing to modify an existing path without an OpenDiscipline ownership manifest: " + root);
  }
}
function assertPlugin(plugin) {
  if (existsSync(plugin) && !managedMarkerPresent(readFileSync(plugin, "utf8"))) {
    throw new Error("Refusing to overwrite unmanaged plugin file: " + plugin);
  }
}
function assertAgents(agents, root) {
  if (!existsSync(agents)) return;
  const text = readFileSync(agents, "utf8");
  const start = text.indexOf(AGENTS_START), end = text.indexOf(AGENTS_END);
  if (start === -1 && end === -1) return;
  if ((start === -1) !== (end === -1) || end < start) throw new Error("Malformed OpenDiscipline AGENTS.md markers: " + agents);
  const section = text.slice(start, end + AGENTS_END.length);
  const manifest = readManifest(root);
  const entry = manifest?.managedFiles?.find((item) => item.path === agents);
  if (!entry?.sectionSha256 || managedSectionHash(section) !== entry.sectionSha256) {
    throw new Error("The OpenDiscipline section in AGENTS.md was edited; refusing to overwrite it automatically.");
  }
}
function stageSource(target) {
  mkdirSync(target, { recursive: true });
  for (const [source, destination] of [
    ["src", "src"],
    [".opencode/skills/open-discipline-workflow/SKILL.md", ".opencode/skills/open-discipline-workflow/SKILL.md"],
    ["package.json", "package.json"],
  ]) {
    const from = resolve(SOURCE_ROOT, source);
    if (!existsSync(from)) throw new Error("Installer package is incomplete; missing " + source);
    const to = resolve(target, destination);
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to, { recursive: true, force: true });
  }
}
function install() {
  const { managedRoot, plugin, skill, agents } = paths();
  assertOwnedRoot(managedRoot);
  assertPlugin(plugin);
  assertAgents(agents, managedRoot);

  const backupDir = join(dirname(managedRoot), "open-discipline-backups", new Date().toISOString().replaceAll(":", "-"));
  const stage = join(dirname(managedRoot), ".open-discipline-stage-" + process.pid);
  const changes = [];
  rmSync(stage, { recursive: true, force: true });

  try {
    stageSource(stage);
    const oldSourceBackup = existsSync(managedRoot) ? backupFile(managedRoot, backupDir) : null;
    if (existsSync(managedRoot)) rmSync(managedRoot, { recursive: true, force: true });
    renameSync(stage, managedRoot);
    changes.push({ kind: "source", path: managedRoot, backup: oldSourceBackup });

    if (existsSync(plugin)) changes.push({ kind: "file", path: plugin, backup: backupFile(plugin, backupDir) });
    else changes.push({ kind: "file", path: plugin, backup: null });
    atomicWrite(plugin, [
      "/* open-discipline:managed */",
      "/* source: " + REPOSITORY + "@" + requestedRef + " */",
      'import OpenDiscipline from "../open-discipline/src/index.ts";',
      'const KEY = Symbol.for("open-discipline.plugin.loaded");',
      'export default async function OpenDisciplineLoader(context) {',
      '  const registry = globalThis;',
      '  if (registry[KEY]) return {};',
      '  registry[KEY] = true;',
      '  return OpenDiscipline(context);',
      '}',
      "",
    ].join("\n"));

    const skillSource = resolve(managedRoot, ".opencode/skills/open-discipline-workflow/SKILL.md");
    if (!existsSync(skillSource)) throw new Error("Installed source is missing workflow skill.");
    if (existsSync(skill)) changes.push({ kind: "file", path: skill, backup: backupFile(skill, backupDir) });
    else changes.push({ kind: "file", path: skill, backup: null });
    atomicWrite(skill, readFileSync(skillSource, "utf8"));

    if (keepAgents) {
      const before = existsSync(agents) ? readFileSync(agents, "utf8") : "";
      const merged = mergeAgentsSection(before);
      if (merged.changed) {
        changes.push({ kind: "agents", path: agents, previous: before });
        atomicWrite(agents, merged.content);
      }
    }

    const agentText = existsSync(agents) ? readFileSync(agents, "utf8") : "";
    const start = agentText.indexOf(AGENTS_START), end = agentText.indexOf(AGENTS_END);
    const manifest = {
      schemaVersion: 1,
      repository: REPOSITORY,
      ref: requestedRef,
      scope,
      managedRoot,
      managedFiles: [
        { path: plugin, sha256: hashText(readFileSync(plugin, "utf8")) },
        { path: skill, sha256: hashText(readFileSync(skill, "utf8")) },
        ...(start !== -1 && end > start ? [{
          path: agents,
          sectionSha256: managedSectionHash(agentText.slice(start, end + AGENTS_END.length)),
          createdByOpenDiscipline: changes.some((item) => item.kind === "agents" && item.previous.trim() === ""),
        }] : []),
      ],
    };
    atomicWrite(join(managedRoot, "install-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    console.log("OpenDiscipline installed successfully.");
    console.log("Scope: " + scope);
    console.log("Source: " + REPOSITORY + "@" + requestedRef);
    console.log("Restart OpenCode to load the plugin.");
  } catch (error) {
    rmSync(stage, { recursive: true, force: true });
    for (const change of [...changes].reverse()) {
      try {
        if (change.kind === "source") {
          rmSync(change.path, { recursive: true, force: true });
          if (change.backup) cpSync(change.backup, change.path, { recursive: true, force: true });
        } else if (change.kind === "file") {
          if (change.backup) cpSync(change.backup, change.path, { recursive: true, force: true });
          else rmSync(change.path, { recursive: true, force: true });
        } else if (change.kind === "agents") {
          atomicWrite(change.path, change.previous);
        }
      } catch {}
    }
    throw error;
  }
}
function verifyEntry(entry) {
  if (!existsSync(entry.path)) throw new Error("Managed file is missing: " + entry.path);
  if (entry.sha256 && hashText(readFileSync(entry.path, "utf8")) !== entry.sha256) {
    throw new Error("Managed file was modified outside OpenDiscipline: " + entry.path);
  }
  if (entry.sectionSha256) {
    const text = readFileSync(entry.path, "utf8");
    const start = text.indexOf(AGENTS_START), end = text.indexOf(AGENTS_END);
    if (start === -1 || end < start) throw new Error("Managed AGENTS.md section is missing: " + entry.path);
    if (managedSectionHash(text.slice(start, end + AGENTS_END.length)) !== entry.sectionSha256) {
      throw new Error("Managed AGENTS.md section was modified: " + entry.path);
    }
  }
}
function uninstall() {
  const { managedRoot, plugin, skill, agents } = paths();
  const manifest = readManifest(managedRoot);
  if (!manifest || manifest.repository !== REPOSITORY || manifest.schemaVersion !== 1) {
    console.log("OpenDiscipline is not installed in this scope.");
    return;
  }
  for (const entry of manifest.managedFiles ?? []) verifyEntry(entry);

  rmSync(plugin, { force: true });
  rmSync(skill, { force: true });

  const agentEntry = manifest.managedFiles.find((entry) => entry.path === agents);
  if (agentEntry) {
    const current = readFileSync(agents, "utf8");
    const start = current.indexOf(AGENTS_START), end = current.indexOf(AGENTS_END);
    const section = current.slice(start, end + AGENTS_END.length);
    const removed = removeAgentsSection(current, section);
    if (removed.changed) atomicWrite(agents, removed.content);
    if (removed.remainingOnlyWhitespace && agentEntry.createdByOpenDiscipline) rmSync(agents, { force: true });
  }
  rmSync(managedRoot, { recursive: true, force: true });
  console.log("OpenDiscipline uninstalled successfully.");
}
function status() {
  const { managedRoot, plugin, skill, agents } = paths();
  const manifest = readManifest(managedRoot);
  if (!manifest) { console.log("OpenDiscipline: not installed (" + scope + ")"); return; }
  try {
    for (const entry of manifest.managedFiles ?? []) verifyEntry(entry);
    console.log("Health: OK");
  } catch (error) {
    console.log("Health: NEEDS ATTENTION");
    console.log(String(error?.message ?? error));
  }
  console.log("Scope: " + scope);
  console.log("Source: " + manifest.repository + "@" + manifest.ref);
  console.log("Plugin: " + plugin);
  console.log("Skill: " + skill);
  console.log("AGENTS.md: " + agents);
}
try {
  if (!["install", "uninstall", "status"].includes(command)) {
    throw new Error("Usage: open-discipline [install|uninstall|status] [--local] [--no-agents] [--ref=<ref>]");
  }
  if (command === "install") install();
  else if (command === "uninstall") uninstall();
  else status();
} catch (error) {
  console.error("OpenDiscipline: " + (error?.message ?? String(error)));
  process.exitCode = 1;
}
