#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { AGENTS_SECTION, getAgentsPath, getManagedRoot, getPluginPath, getSkillPath, hashText, managedMarkerPresent, mergeAgentsSection } from "./installer-lib.mjs";

const REPO = "Yoganataa/open-discipline";
const DEFAULT_REF = "maturity-hardening";
const scope = process.argv.includes("--local") ? "project" : "global";
const refArg = process.argv.find((arg) => arg.startsWith("--ref="));
const ref = refArg ? refArg.slice("--ref=".length) : DEFAULT_REF;
const keepAgents = !process.argv.includes("--no-agents");

function run(command, args, options = {}) { return execFileSync(command, args, { stdio: "inherit", ...options }); }
function runQuiet(command, args, options = {}) { return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options }).trim(); }
function backup(path, backupDir) {
  if (!existsSync(path)) return;
  mkdirSync(backupDir, { recursive: true });
  cpSync(path, join(backupDir, path.split(/[\\/]/).pop()), { recursive: true, errorOnExist: false });
}
function atomicReplace(path, content) {
  const temp = path + ".tmp-" + process.pid;
  writeFileSync(temp, content, "utf8");
  renameSync(temp, path);
}

const scopeRoot = resolve(getManagedRoot(scope));
const pluginPath = resolve(getPluginPath(scope));
const skillPath = resolve(getSkillPath(scope));
const agentsPath = resolve(getAgentsPath(scope));
const backupDir = join(scopeRoot, "backups", new Date().toISOString().replaceAll(":", "-"));
mkdirSync(scopeRoot, { recursive: true });

function preflight() {
  if (existsSync(pluginPath)) {
    const existing = readFileSync(pluginPath, "utf8");
    if (!managedMarkerPresent(existing)) throw new Error("Refusing to overwrite unmanaged plugin file: " + pluginPath);
  }
  if (keepAgents && existsSync(agentsPath)) {
    const existing = readFileSync(agentsPath, "utf8");
    const start = existing.indexOf("<!-- open-discipline:start -->");
    const end = existing.indexOf("<!-- open-discipline:end -->");
    if ((start === -1) !== (end === -1) || (start !== -1 && end < start)) {
      throw new Error("Refusing to modify malformed AGENTS.md OpenDiscipline markers: " + agentsPath);
    }
    if (start !== -1) {
      const currentSection = existing.slice(start, end + "<!-- open-discipline:end -->".length);
      const normalizedSection = currentSection.replaceAll("\\r\\n", "\\n");
      if (normalizedSection !== AGENTS_SECTION) {
        const manifestPath = join(scopeRoot, "install-manifest.json");
        const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : null;
        const recorded = manifest?.managedFiles?.find((entry) => entry.path === agentsPath)?.sectionSha256;
        if (!recorded || hashText(normalizedSection) !== recorded) {
          throw new Error("Refusing to overwrite a user-edited OpenDiscipline AGENTS.md section: " + agentsPath);
        }
      }
    }
  }
}

preflight();

if (!existsSync(resolve(scopeRoot, ".git"))) {
  const parent = resolve(scopeRoot, "..");
  mkdirSync(parent, { recursive: true });
  const tempClone = join(tmpdir(), "open-discipline-" + process.pid);
  rmSync(tempClone, { recursive: true, force: true });
  try {
    const sourceUrl = "https://github.com/" + REPO + ".git";
    if (/^[0-9a-f]{40}$/i.test(ref)) {
      run("git", ["clone", "--depth", "1", sourceUrl, tempClone]);
      run("git", ["-C", tempClone, "fetch", "--depth", "1", "origin", ref]);
      run("git", ["-C", tempClone, "checkout", "--detach", "FETCH_HEAD"]);
    } else {
      run("git", ["clone", "--depth", "1", "--branch", ref, sourceUrl, tempClone]);
    }
    const commit = runQuiet("git", ["-C", tempClone, "rev-parse", "HEAD"]);
    cpSync(tempClone, scopeRoot, { recursive: true });
    writeFileSync(join(scopeRoot, "INSTALL-COMMIT"), commit + "\n", "utf8");
  } finally { rmSync(tempClone, { recursive: true, force: true }); }
} else {
  const origin = runQuiet("git", ["-C", scopeRoot, "remote", "get-url", "origin"]);
  if (!origin.includes(REPO)) throw new Error("Refusing to reuse managed root with an unexpected git origin: " + origin);
  run("git", ["-C", scopeRoot, "fetch", "--depth", "1", "origin", ref]);
  if (/^[0-9a-f]{40}$/i.test(ref)) run("git", ["-C", scopeRoot, "checkout", "--detach", "FETCH_HEAD"]);\n  else run("git", ["-C", scopeRoot, "checkout", "--detach", "origin/" + ref]);
  writeFileSync(join(scopeRoot, "INSTALL-COMMIT"), runQuiet("git", ["-C", scopeRoot, "rev-parse", "HEAD"]) + "\n", "utf8");
}

mkdirSync(resolve(pluginPath, ".."), { recursive: true });
if (existsSync(pluginPath)) {
  const existing = readFileSync(pluginPath, "utf8");
  if (!managedMarkerPresent(existing)) throw new Error("Refusing to overwrite unmanaged plugin file: " + pluginPath);
  backup(pluginPath, backupDir);
}
const loader = ["/* open-discipline:managed */", "/* source: github.com/" + REPO + "@" + ref + " */", 'export { default } from "../open-discipline/src/index.ts";', ""].join("\n");
atomicReplace(pluginPath, loader);

const skillSource = resolve(scopeRoot, ".opencode", "skills", "open-discipline-workflow", "SKILL.md");
if (!existsSync(skillSource)) throw new Error("Installed source is missing workflow skill: " + skillSource);
mkdirSync(resolve(skillPath, ".."), { recursive: true });
if (existsSync(skillPath)) backup(skillPath, backupDir);
atomicReplace(skillPath, readFileSync(skillSource, "utf8"));

if (keepAgents) {
  const existing = existsSync(agentsPath) ? readFileSync(agentsPath, "utf8") : "";
  const merged = mergeAgentsSection(existing);
  if (merged.changed) {
    if (existsSync(agentsPath)) backup(agentsPath, backupDir);
    mkdirSync(resolve(agentsPath, ".."), { recursive: true });
    atomicReplace(agentsPath, merged.content);
  }
}

const manifest = {
  schemaVersion: 1,
  repository: "https://github.com/" + REPO,
  ref,
  commit: readFileSync(join(scopeRoot, "INSTALL-COMMIT"), "utf8").trim(),
  scope,
  managedRoot: scopeRoot,
  managedFiles: [
    { path: pluginPath, sha256: hashText(readFileSync(pluginPath, "utf8")) },
    { path: skillPath, sha256: hashText(readFileSync(skillPath, "utf8")) },
    ...(keepAgents && existsSync(agentsPath) ? [{ path: agentsPath, sectionSha256: hashText(AGENTS_SECTION) }] : []),
  ],
};
writeFileSync(join(scopeRoot, "install-manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log("OpenDiscipline installed from GitHub " + REPO + "@" + ref);
console.log("Scope: " + scope);
console.log("Managed source: " + scopeRoot);
console.log("Plugin: " + pluginPath);
console.log("Skill: " + skillPath);
if (keepAgents) console.log("AGENTS.md: " + agentsPath + " (marker-scoped, existing content preserved)");
