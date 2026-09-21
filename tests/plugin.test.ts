import test from "node:test";
import assert from "node:assert/strict";
import { OpenDisipline } from "../src/index.ts";

async function plugin() {
  return OpenDisipline({
    directory: process.cwd(),
    worktree: process.cwd(),
    project: {} as never,
    client: {} as never,
    serverUrl: new URL("http://localhost"),
    experimental_workspace: { register() {} },
    $: {} as never,
  });
}

test("exposes V1 hooks", async () => {
  const p = await plugin();
  assert.equal(typeof p["tool.execute.before"], "function");
  assert.equal(typeof p["experimental.chat.messages.transform"], "function");
  assert.equal(typeof p["command.execute.before"], "function");
  assert.equal(typeof p["permission.ask"], "function");
});

test("blocks violating write", async () => {
  const p = await plugin();
  const h = p["tool.execute.before"]!;
  await assert.rejects(
    () => h(
      { tool: "write", sessionID: "s", callID: "c" },
      { args: { filePath: "src/OpenDisiplineUserRepository.ts", content: "export class OpenDisiplineUserRepository {}" } },
    ),
    /Open Disipline/,
  );
});

test("allows protected example env files", async () => {
  const p = await plugin();
  const h = p["permission.ask"]!;
  const output = { status: "ask" as "ask" | "deny" | "allow" };
  await h({ permission: "read", patterns: [".env.example"], sessionID: "s", id: "per_test", metadata: {}, always: [] } as never, output);
  assert.equal(output.status, "ask");
});
