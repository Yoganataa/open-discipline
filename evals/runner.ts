import { spawn } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { validateScenario, type Scenario } from "./contract.ts";
import { parseOpenCodeStream } from "./opencode-stream.ts";

export interface BehavioralRunOptions {
  scenario: Scenario;
  mode: "baseline" | "guided";
  executor?: string;
  model?: string;
  opencodeCommand?: string;
  timeoutMs?: number;
  outputRoot?: string;
}

export interface BehavioralEvidence {
  id: string;
  observed: boolean;
  detail?: string;
  source: "executor" | "repository" | "command";
}

export interface BehavioralRunResult {
  scenarioID: string;
  mode: "baseline" | "guided";
  outcome: "completed" | "failed" | "blocked" | "abandoned" | "unknown";
  evidence: BehavioralEvidence[];
  failures: string[];
  workspace: string;
  eventsPath: string;
  changedFiles: string[];
  executor?: string;
  model?: string;
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(() => reject(new Error("behavioral-runner-timeout")));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      finish(() => reject(error));
    });
    child.once("exit", (code) => {
      finish(() => resolvePromise({
        code: code ?? 1,
        stdout,
        stderr,
      }));
    });
  });
}

async function listChangedFiles(workspace: string): Promise<string[]> {
  const result = await runCommand("git", ["status", "--short"], workspace, 10_000);
  if (result.code !== 0) return [];

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim().slice(3))
    .filter(Boolean)
    .sort();
}

function matchesPath(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const normalized = pattern.replaceAll("\\", "/");
    if (normalized.endsWith("/**")) {
      return path.startsWith(normalized.slice(0, -2));
    }
    return path === normalized;
  });
}

function addEvidence(
  evidence: BehavioralEvidence[],
  id: string,
  observed: boolean,
  detail: string,
  source: BehavioralEvidence["source"],
): void {
  evidence.push({ id, observed, detail, source });
}

export async function runBehavioralEvaluation(
  options: BehavioralRunOptions,
): Promise<BehavioralRunResult> {
  const errors = validateScenario(options.scenario);
  if (errors.length > 0) {
    throw new Error("Invalid scenario: " + errors.join(", "));
  }

  if (!options.scenario.modes.includes(options.mode)) {
    throw new Error("Scenario does not support mode: " + options.mode);
  }

  const timeoutMs = options.timeoutMs ?? 10 * 60_000;
  const sourceFixture = resolve(process.cwd(), "evals", options.scenario.fixture);
  const workspace = await mkdtemp(join(tmpdir(), "open-discipline-eval-"));
  const outputRoot = options.outputRoot
    ? resolve(options.outputRoot)
    : await mkdtemp(join(tmpdir(), "open-discipline-eval-artifacts-"));

  await cp(sourceFixture, workspace, { recursive: true });

  for (const args of [
    ["init", "-q"],
    ["config", "user.email", "eval@open-discipline.local"],
    ["config", "user.name", "OpenDiscipline Eval"],
  ]) {
    const result = await runCommand("git", args, workspace, 10_000);
    if (result.code !== 0) {
      throw new Error("behavioral-runner-git-setup-failed:" + args.join(" "));
    }
  }

  await runCommand("git", ["add", "."], workspace, 10_000);
  const baselineCommit = await runCommand(
    "git",
    ["commit", "-qm", "fixture baseline"],
    workspace,
    10_000,
  );
  if (baselineCommit.code !== 0) {
    throw new Error("behavioral-runner-baseline-commit-failed");
  }

  if (options.mode === "guided") {
    const skillSource = resolve(process.cwd(), ".opencode", "skills", "open-discipline-workflow");
    const skillTarget = join(workspace, ".opencode", "skills", "open-discipline-workflow");

    await mkdir(skillTarget, { recursive: true });
    await cp(skillSource, skillTarget, { recursive: true });
    await writeFile(
      join(workspace, "AGENTS.md"),
      [
        "# Evaluation repository",
        "",
        "Use the OpenDiscipline workflow skill for non-trivial work.",
        "Never claim completion without observed validation evidence.",
      ].join("\n") + "\n",
      "utf8",
    );
  }

  const prompt = [
    options.scenario.objective,
    "",
    "Required behaviors:",
    ...options.scenario.requiredBehaviors.map((value) => "- " + value),
    "",
    "Forbidden behaviors:",
    ...options.scenario.forbiddenBehaviors.map((value) => "- " + value),
    "",
    options.mode === "guided"
      ? "Follow the repository's OpenDiscipline workflow instructions and record observed validation evidence."
      : "Work directly on the task using the repository's existing instructions.",
  ].join("\n");

  const command = options.opencodeCommand ?? "opencode";
  const execution = await runCommand(
    command,
    ["run", "--format", "json", prompt],
    workspace,
    timeoutMs,
  );
  const stream = parseOpenCodeStream(execution.stdout);

  await mkdir(outputRoot, { recursive: true });
  await cp(sourceFixture, join(outputRoot, "fixture-baseline"), { recursive: true });
  await writeFile(join(outputRoot, "events.ndjson"), execution.stdout, "utf8");
  await writeFile(join(outputRoot, "stderr.log"), execution.stderr, "utf8");
  await writeFile(
    join(outputRoot, "result.json"),
    JSON.stringify(
      {
        scenarioID: options.scenario.id,
        mode: options.mode,
        exitCode: execution.code,
        executor: options.executor ?? "opencode",
        model: options.model,
      },
      null,
      2,
    ),
    "utf8",
  );

  const changedFiles = await listChangedFiles(workspace);
  const commands = stream.toolCalls
    .filter((call) => call.tool === "bash")
    .map((call) => typeof call.input.command === "string" ? call.input.command : "");

  const evidence: BehavioralEvidence[] = [];
  const failures: string[] = [];

  if (stream.invalidLines > 0) {
    failures.push("invalid-json-lines:" + stream.invalidLines);
  }
  if (stream.incompleteSteps > 0) {
    failures.push("incomplete-opencode-stream");
  }
  if (stream.errors.length > 0) {
    failures.push("opencode-errors:" + stream.errors.join(" | "));
  }

  if (options.scenario.verifier) {
    const verifierPath = resolve(process.cwd(), options.scenario.verifier);
    const verifier = await runCommand(
      process.execPath,
      [verifierPath, workspace],
      process.cwd(),
      timeoutMs,
    );
    const observed = verifier.code === 0;
    addEvidence(
      evidence,
      "verifier",
      observed,
      verifier.stdout.trim() || verifier.stderr.trim() || "Verifier produced no output.",
      "repository",
    );
    if (!observed) {
      failures.push("verifier-failed");
    }
  }

  const commandPatterns = options.scenario.checks?.requiredCommands ?? [];
  const requiredCommandEvidence = options.scenario.evidence.filter(
    (item) => item.required && item.kind === "command",
  );

  for (const [index, pattern] of commandPatterns.entries()) {
    const observed = commands.some((commandLine) => commandLine.includes(pattern));
    const evidenceID = requiredCommandEvidence[index]?.id ?? "command:" + pattern;
    addEvidence(
      evidence,
      evidenceID,
      observed,
      observed
        ? "Required command pattern observed."
        : "Required command pattern was not observed.",
      "executor",
    );
    if (!observed) {
      failures.push("missing-command:" + pattern);
    }
  }

  if (options.scenario.checks?.allowedChangedPaths) {
    const unexpected = changedFiles.filter(
      (path) => !matchesPath(path, options.scenario.checks!.allowedChangedPaths!),
    );
    addEvidence(
      evidence,
      "scope",
      unexpected.length === 0,
      unexpected.length === 0
        ? "All changed paths are within the declared allowlist."
        : "Unexpected paths: " + unexpected.join(", "),
      "repository",
    );
    if (unexpected.length > 0) {
      failures.push("scope:" + unexpected.join(","));
    }
  }

  if (options.scenario.checks?.requiredFiles) {
    const missing = options.scenario.checks.requiredFiles.filter(
      (path) => !existsSync(join(workspace, path)),
    );
    addEvidence(
      evidence,
      "required-files",
      missing.length === 0,
      missing.length === 0
        ? "All required files exist."
        : "Missing files: " + missing.join(", "),
      "repository",
    );
    if (missing.length > 0) {
      failures.push("missing-files:" + missing.join(","));
    }
  }

  if (options.scenario.checks?.requiredChangedPaths) {
    const missing = options.scenario.checks.requiredChangedPaths.filter(
      (path) => !changedFiles.includes(path),
    );
    addEvidence(
      evidence,
      "required-changed-paths",
      missing.length === 0,
      missing.length === 0
        ? "All required paths changed."
        : "Unchanged required paths: " + missing.join(", "),
      "repository",
    );
    if (missing.length > 0) {
      failures.push("missing-changes:" + missing.join(","));
    }
  }

  if (options.scenario.checks?.forbiddenChangedPaths) {
    const forbidden = changedFiles.filter(
      (path) => matchesPath(path, options.scenario.checks!.forbiddenChangedPaths!),
    );
    addEvidence(
      evidence,
      "forbidden-paths",
      forbidden.length === 0,
      forbidden.length === 0
        ? "No forbidden paths changed."
        : "Forbidden paths: " + forbidden.join(", "),
      "repository",
    );
    if (forbidden.length > 0) {
      failures.push("forbidden-paths:" + forbidden.join(","));
    }
  }

  if (options.scenario.checks?.forbiddenCommands) {
    const matches = commands.filter((commandLine) =>
      options.scenario.checks!.forbiddenCommands!.some((pattern) => commandLine.includes(pattern)),
    );
    addEvidence(
      evidence,
      "forbidden-commands",
      matches.length === 0,
      matches.length === 0
        ? "No forbidden command pattern observed."
        : "Forbidden commands: " + matches.join(" | "),
      "executor",
    );
    if (matches.length > 0) {
      failures.push("forbidden-commands");
    }
  }

  const requiredArtifacts = options.scenario.checks?.requiredArtifacts ?? [];
  for (const artifact of requiredArtifacts) {
    const present = existsSync(join(workspace, artifact));
    const artifactEvidence = options.scenario.evidence.find(
      (item) => item.required && item.kind === "artifact" && item.paths?.includes(artifact),
    );
    const evidenceID = artifactEvidence?.id ?? "artifact:" + artifact;
    addEvidence(
      evidence,
      evidenceID,
      present,
      present
        ? "Required workflow artifact exists."
        : "Required workflow artifact is missing.",
      "repository",
    );
    if (!present) {
      failures.push("missing-artifact:" + artifact);
    }
  }

  const requiredEvidence = options.scenario.evidence.filter((item) => item.required);
  const evidenceByID = new Map(evidence.map((item) => [item.id, item]));
  const missingEvidence = requiredEvidence.filter((item) => {
    const observed = evidenceByID.get(item.id)?.observed === true;
    return !observed;
  });

  for (const item of missingEvidence) {
    failures.push("missing-evidence:" + item.id);
  }

  const outcome = execution.code !== 0
    ? "failed"
    : failures.length === 0
      ? "completed"
      : "unknown";

  return {
    scenarioID: options.scenario.id,
    mode: options.mode,
    outcome,
    evidence,
    failures,
    workspace,
    eventsPath: join(outputRoot, "events.ndjson"),
    changedFiles,
    executor: options.executor ?? "opencode",
    model: options.model,
  };
}

export async function cleanupBehavioralWorkspace(workspace: string): Promise<void> {
  if (workspace && workspace.startsWith(join(tmpdir(), "open-discipline-eval-"))) {
    await rm(workspace, { recursive: true, force: true });
  }
}
