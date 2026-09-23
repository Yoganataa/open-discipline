import { mkdtemp, rm, writeFile, readFile, mkdir } from "node:fs/promises";
import { tmpdir, platform } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const installer = join(root, "scripts", "install-opencode.mjs");
const run = (args, cwd, env = {}) => execFileSync(process.execPath, [installer, ...args], {
  cwd,
  env: { ...process.env, ...env },
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
const expectFailure = (fn) => {
  try { fn(); assert.fail("expected command to fail"); }
  catch (error) { assert.notEqual(error?.status, 0 === true ? undefined : 0); }
};

const temp = await mkdtemp(join(tmpdir(), "open-discipline-installer-"));
try {
  const project = join(temp, "project");
  const home = join(temp, "home");
  const customConfig = join(temp, "custom-opencode");
  await mkdir(project, { recursive: true });
  await mkdir(home, { recursive: true });
  await mkdir(customConfig, { recursive: true });

  const originalAgents = [
    "# Existing project instructions",
    "",
    "<!-- codebase-memory-mcp:start -->",
    "# Codebase Memory",
    "",
    "KEEP THIS BLOCK EXACTLY AS-IS",
    "<!-- codebase-memory-mcp:end -->",
    "",
    "<!-- context7 -->",
    "KEEP CONTEXT7",
    "<!-- context7 -->",
    "",
  ].join("\n");
  await writeFile(join(project, "AGENTS.md"), originalAgents, "utf8");

  run(["install", "--local"], project);
  const installedAgents = await readFile(join(project, "AGENTS.md"), "utf8");
  assert.match(installedAgents, /codebase-memory-mcp:start/);
  assert.match(installedAgents, /KEEP THIS BLOCK EXACTLY AS-IS/);
  assert.match(installedAgents, /context7/);
  assert.match(installedAgents, /open-discipline:start/);

  run(["status", "--local"], project);
  run(["uninstall", "--local"], project);
  const restoredAgents = await readFile(join(project, "AGENTS.md"), "utf8");
  assert.equal(restoredAgents, originalAgents);
  
  const globalEnv = { HOME: home, USERPROFILE: home, OPENCODE_CONFIG_DIR: customConfig };
  run(["install"], project, globalEnv);
  const globalPlugin = join(customConfig, "plugins", "open-discipline.ts");
  assert.match(await readFile(globalPlugin, "utf8"), /open-discipline:managed/);
  run(["status"], project, globalEnv);
  run(["uninstall"], project, globalEnv);
  let removedPlugin = true;
  try {
    await readFile(join(customConfig, "plugins", "open-discipline.ts"));
    removedPlugin = false;
  } catch {}
  assert.equal(removedPlugin, true);

  const conflictProject = join(temp, "conflict");
  await mkdir(join(conflictProject, ".opencode", "plugins"), { recursive: true });
  const conflictPlugin = join(conflictProject, ".opencode", "plugins", "open-discipline.ts");
  await writeFile(conflictPlugin, "export default () => ({})\n", "utf8");
  let conflictFailed = false;
  try { run(["install", "--local"], conflictProject); } catch { conflictFailed = true; }
  assert.equal(conflictFailed, true);
  assert.equal(await readFile(conflictPlugin, "utf8"), "export default () => ({})\n");

  const editedProject = join(temp, "edited");
  await mkdir(editedProject, { recursive: true });
  run(["install", "--local"], editedProject);
  const editedAgents = join(editedProject, "AGENTS.md");
  const edited = (await readFile(editedAgents, "utf8")).replace("Never claim a test or validation passed without observed evidence.", "USER EDIT");
  await writeFile(editedAgents, edited, "utf8");
  let uninstallFailed = false;
  try { run(["uninstall", "--local"], editedProject); } catch { uninstallFailed = true; }
  assert.equal(uninstallFailed, true);
  assert.equal((await readFile(editedAgents, "utf8")).includes("USER EDIT"), true);

  console.log("installer platform smoke: PASS (" + platform() + ")");
} finally {
  await rm(temp, { recursive: true, force: true });
}
