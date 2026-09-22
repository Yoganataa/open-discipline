import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import os from "node:os";

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const output = resolve(arg("--output", "artifacts/open-discipline-smoke"));
mkdirSync(output, { recursive: true });
const eventsPath = resolve(arg("--events", output + "/events.ndjson"));
const mode = arg("--mode", process.env.OPENDISCIPLINE_SMOKE_OPTIONAL_OFF === "1" ? "optional-hooks-off" : "normal");

function run(command, args) {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    return String(error?.stdout ?? "").trim() || "unavailable";
  }
}

const opencodeVersion = run(process.platform === "win32" ? "opencode.cmd" : "opencode", ["--version"]);
const gitSha = run("git", ["rev-parse", "HEAD"]);
const gitBranch = run("git", ["branch", "--show-current"]);
const events = existsSync(eventsPath)
  ? readFileSync(eventsPath, "utf8").split("\n").filter(Boolean).map((line) => {
      try { return JSON.parse(line); } catch { return { type: "invalid-json", detail: line }; }
    })
  : [];

const sessionIDs = new Set(events.map((event) => event.sessionID).filter(Boolean));
const has = (predicate) => events.some(predicate);
const checks = [
  { id: "plugin-load", status: has(e => e.type === "plugin.loaded") ? "passed" : "failed", evidence: "plugin.loaded event" },
  { id: "tool-hook", status: has(e => e.type === "hook.fired" && e.hook === "tool.execute.before") ? "passed" : "failed", evidence: "tool.execute.before event" },
  { id: "blocked-guard", status: has(e => e.outcome === "blocked") ? "passed" : "unknown", evidence: "blocked guard/rule event" },
  { id: "warning-without-block", status: has(e => e.outcome === "warning") ? "passed" : "unknown", evidence: "warning guard/rule event" },
  { id: "child-session", status: sessionIDs.size >= 2 ? "passed" : "unknown", evidence: "observed session IDs: " + sessionIDs.size },
];

if (mode === "optional-hooks-off") {
  checks.push({
    id: "core-with-optional-hooks-off",
    status: checks.find(c => c.id === "tool-hook")?.status === "passed" && checks.find(c => c.id === "blocked-guard")?.status === "passed" ? "passed" : "unknown",
    evidence: "core tool boundary remained observable while optional hooks were disabled",
  });
} else {
  checks.push({
    id: "optional-hooks",
    status: has(e => e.hook === "experimental.chat.messages.transform" || e.hook === "permission.ask" || e.hook === "event") ? "passed" : "unknown",
    evidence: "optional hook event",
  });
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  mode,
  host: { platform: process.platform, arch: process.arch, os: os.type() + " " + os.release(), node: process.version, opencode: opencodeVersion },
  repository: { branch: gitBranch, commit: gitSha },
  eventFile: eventsPath,
  eventCount: events.length,
  sessionCount: sessionIDs.size,
  checks,
  rawEvents: events,
};

writeFileSync(output + "/report.json", JSON.stringify(report, null, 2) + "\n");
writeFileSync(output + "/report.md", [
  "# OpenDiscipline OpenCode Smoke Report",
  "",
  "- Generated: " + report.generatedAt,
  "- Mode: " + mode,
  "- OpenCode: " + opencodeVersion,
  "- Node: " + process.version,
  "- Platform: " + process.platform + "/" + process.arch,
  "- Repository commit: " + gitSha,
  "- Event count: " + events.length,
  "- Session count: " + sessionIDs.size,
  "",
  "## Checks",
  "",
  ...checks.map(c => "- " + c.status.toUpperCase() + " — " + c.id + ": " + c.evidence),
  "",
  "## Evidence",
  "",
  "The JSON report contains raw hook and guard events. UNKNOWN means the smoke session did not produce sufficient evidence; it is not treated as PASS.",
  "",
].join("\n"));

console.log(output + "/report.md");
console.log(output + "/report.json");
