#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { runBehavioralEvaluation } from "../evals/runner.ts";

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

const scenarioID = arg("--scenario");
const mode = arg("--mode", "guided");
if (!scenarioID) {
  console.error("Usage: npm run eval:behavior -- --scenario <id> --mode baseline|guided");
  process.exit(2);
}
if (mode !== "baseline" && mode !== "guided") {
  console.error("--mode must be baseline or guided");
  process.exit(2);
}

const files = await import("node:fs/promises").then(({ readdir }) =>
  readdir(resolve(process.cwd(), "evals", "scenarios"))
);
let scenario;
for (const file of files.filter((file) => file.endsWith(".json"))) {
  const candidate = JSON.parse(await readFile(resolve(process.cwd(), "evals", "scenarios", file), "utf8"));
  if (candidate.id === scenarioID) {
    scenario = candidate;
    break;
  }
}
if (!scenario) throw new Error("Unknown scenario: " + scenarioID);

const outputRoot = resolve(
  arg("--output", join("artifacts", "behavioral-evals", scenarioID, mode)),
);
await mkdir(outputRoot, { recursive: true });

const result = await runBehavioralEvaluation({
  scenario,
  mode,
  executor: "opencode-run",
  model: arg("--model"),
  opencodeCommand: arg("--opencode", "opencode"),
  timeoutMs: Number(arg("--timeout-ms", "600000")),
  outputRoot,
});

await writeFile(join(outputRoot, "normalized-result.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
console.log(JSON.stringify({
  scenario: result.scenarioID,
  mode: result.mode,
  outcome: result.outcome,
  changedFiles: result.changedFiles,
  failures: result.failures,
  events: result.eventsPath,
}, null, 2));
