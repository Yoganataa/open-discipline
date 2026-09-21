import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectBrands, loadConfig } from "../src/config.ts";

async function tempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "odcfg-"));
}

test("detects brand from package.json name", async () => {
  const d = await tempDir();
  try {
    await writeFile(join(d, "package.json"), JSON.stringify({ name: "billing-app-service" }));
    assert.deepEqual(await detectBrands(d), ["BillingAppService"]);
  } finally { await rm(d, { recursive: true, force: true }); }
});

test("falls back to directory basename without package.json", async () => {
  const d = await tempDir();
  try {
    const [brand] = await detectBrands(d);
    assert.ok(brand);
    assert.match(brand, /^[A-Z]/);
    assert.ok(brand.toLowerCase().includes("odcfg"));
  } finally { await rm(d, { recursive: true, force: true }); }
});

test("auto-brands merge with configured brands", async () => {
  const d = await tempDir();
  try {
    await writeFile(join(d, "package.json"), JSON.stringify({ name: "billing" }));
    await writeFile(join(d, "discipline.config.json"), JSON.stringify({ brands: ["Acme"] }));
    const c = await loadConfig(d);
    assert.ok(c.brands.includes("Acme") && c.brands.includes("Billing"));
  } finally { await rm(d, { recursive: true, force: true }); }
});

test("autoBrands:false disables detection", async () => {
  const d = await tempDir();
  try {
    await writeFile(join(d, "package.json"), JSON.stringify({ name: "billing" }));
    await writeFile(join(d, "discipline.config.json"), JSON.stringify({ brands: ["Acme"], autoBrands: false }));
    assert.deepEqual((await loadConfig(d)).brands, ["Acme"]);
  } finally { await rm(d, { recursive: true, force: true }); }
});

test("zero config still yields a workable brand", async () => {
  const d = await tempDir();
  try {
    const c = await loadConfig(d);
    assert.ok(c.brands.length > 0);
  } finally { await rm(d, { recursive: true, force: true }); }
});