import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const mode = process.argv.includes("--optional-hooks-off") ? "optional-hooks-off" : "normal";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const output = resolve("artifacts", "open-discipline-smoke", stamp + "-" + mode);
mkdirSync(output, { recursive: true });

const opencode = process.platform === "win32" ? "opencode.cmd" : "opencode";
const env = {
  ...process.env,
  OPENDISCIPLINE_SMOKE: "1",
  OPENDISCIPLINE_SMOKE_REPORT: resolve(output, "events.ndjson"),
};
if (mode === "optional-hooks-off") env.OPENDISCIPLINE_SMOKE_OPTIONAL_OFF = "1";

console.log("OpenDiscipline smoke mode: " + mode);
console.log("Report directory: " + output);
console.log("OpenCode: " + execFileSync(opencode, ["--version"], { encoding: "utf8" }).trim());
console.log("");
console.log("Run the smoke instructions in docs/SMOKE-TEST.md inside OpenCode.");
console.log("Exit OpenCode when the requested checks are complete.");

const child = spawn(opencode, [], { stdio: "inherit", env });
child.on("error", error => {
  console.error("Failed to start OpenCode:", error.message);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  if (signal) {
    console.error("OpenCode exited by signal " + signal);
    process.exitCode = 1;
  } else {
    process.exitCode = code ?? 1;
  }
  if (process.exitCode === 0) {
    const report = spawn(process.execPath, ["scripts/smoke-report.mjs", "--output", output, "--events", resolve(output, "events.ndjson"), "--mode", mode], { stdio: "inherit" });
    report.on("exit", reportCode => { process.exitCode = reportCode ?? 1; });
  }
});
