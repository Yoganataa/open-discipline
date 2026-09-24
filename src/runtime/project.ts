import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

export interface JavaScriptPackageTruth {
  name: string;
  declaredRange?: string;
  lockVersion?: string;
  installedVersion?: string;
  resolved?: boolean;
}

export interface DependencyImportEvidence {
  spec: string;
  name: string;
  declared: boolean;
  resolved: boolean;
  lockVersion?: string;
  installedVersion?: string;
  reason?: string;
}

export interface AddedDependencyEvidence {
  name: string;
  value?: string;
  section: "dependencies" | "devDependencies" | "peerDependencies" | "optionalDependencies" | "python" | "go" | "rust" | "dart" | "unknown";
}

export interface DependencyInventory {
  javascript: string[];
  python: string[];
  go: string[];
  rust: string[];
  dart: string[];
  javascriptTruth: Record<string, JavaScriptPackageTruth>;
  manifestIssues: string[];
}

async function textFile(path: string): Promise<string | undefined> {
  try { return await readFile(path, "utf8"); } catch { return undefined; }
}

async function jsonFile(path: string): Promise<Record<string, unknown> | undefined> {
  try {
    const value = JSON.parse(await readFile(path, "utf8")) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

function keysFromPackageJson(text: string): string[] {
  try {
    const p = JSON.parse(text) as Record<string, unknown>;
    const out = new Set<string>();
    for (const key of ["dependencies","devDependencies","peerDependencies","optionalDependencies"]) {
      const section = p[key];
      if (section && typeof section === "object" && !Array.isArray(section)) {
        for (const name of Object.keys(section as Record<string, unknown>)) out.add(name);
      }
    }
    return [...out];
  } catch { return []; }
}

function normalizePackageName(name: string): string {
  return name.toLowerCase();
}

function topPackage(spec: string): string {
  return spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]!;
}

function packageSections(p: Record<string, unknown>): Array<[AddedDependencyEvidence["section"], Record<string, unknown>]> {
  const out: Array<[AddedDependencyEvidence["section"], Record<string, unknown>]> = [];
  for (const section of ["dependencies","devDependencies","peerDependencies","optionalDependencies"] as const) {
    const value = p[section];
    if (value && typeof value === "object" && !Array.isArray(value)) out.push([section, value as Record<string, unknown>]);
  }
  return out;
}

function packageLockEntry(lock: Record<string, unknown> | undefined, name: string): Record<string, unknown> | undefined {
  const packages = lock?.packages;
  if (!packages || typeof packages !== "object" || Array.isArray(packages)) return undefined;
  const entry = (packages as Record<string, unknown>)[`node_modules/${name}`];
  return entry && typeof entry === "object" && !Array.isArray(entry) ? entry as Record<string, unknown> : undefined;
}

function packageLockRoot(lock: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  const packages = lock?.packages;
  if (!packages || typeof packages !== "object" || Array.isArray(packages)) return undefined;
  const root = (packages as Record<string, unknown>)[""];
  return root && typeof root === "object" && !Array.isArray(root) ? root as Record<string, unknown> : undefined;
}

function comparePackageManifest(packageJson: Record<string, unknown> | undefined, lock: Record<string, unknown> | undefined): string[] {
  if (!packageJson || !lock) return [];
  const root = packageLockRoot(lock);
  if (!root) return ["package-lock.json has no root package entry; lockfile truth cannot be established."];
  const issues: string[] = [];
  if (typeof packageJson.name === "string" && root.name !== packageJson.name) {
    issues.push(`package-lock root name "${String(root.name)}" does not match package.json name "${packageJson.name}".`);
  }
  if (typeof packageJson.version === "string" && root.version !== packageJson.version) {
    issues.push(`package-lock root version "${String(root.version)}" does not match package.json version "${packageJson.version}".`);
  }
  for (const section of ["dependencies","devDependencies","peerDependencies","optionalDependencies"] as const) {
    const declared = packageJson[section];
    const locked = root[section];
    if (!declared || typeof declared !== "object" || Array.isArray(declared)) continue;
    if (!locked || typeof locked !== "object" || Array.isArray(locked)) {
      issues.push(`package-lock root is missing the ${section} dependency section present in package.json.`);
      continue;
    }
    const lockedMap = locked as Record<string, unknown>;
    for (const [name, value] of Object.entries(declared as Record<string, unknown>)) {
      if (lockedMap[name] !== value) {
        issues.push(`package-lock root ${section} entry for "${name}" does not match package.json (declared ${JSON.stringify(value)}, locked ${JSON.stringify(lockedMap[name])}).`);
      }
    }
  }
  return issues;
}

async function nearestPackageJson(resolvedFile: string, expectedName: string, directory: string): Promise<Record<string, unknown> | undefined> {
  let current = dirname(resolvedFile);
  const stop = dirname(directory);
  for (let i = 0; i < 20; i++) {
    const candidate = await jsonFile(join(current, "package.json"));
    if (candidate && candidate.name === expectedName) return candidate;
    const parent = dirname(current);
    if (parent === current || current === stop) break;
    current = parent;
  }
  return undefined;
}

export async function inspectJavascriptImports(
  directory: string,
  specs: string[],
  inventory: DependencyInventory,
): Promise<DependencyImportEvidence[]> {
  const resolver = createRequire(join(directory, "__open_disipline_resolver__.cjs"));
  const out: DependencyImportEvidence[] = [];
  const seen = new Set<string>();

  for (const spec of specs) {
    const name = topPackage(spec);
    if (seen.has(spec) || inventory.javascript.every((item) => normalizePackageName(item) !== normalizePackageName(name))) continue;
    seen.add(spec);

    const truth = inventory.javascriptTruth[name] ?? inventory.javascriptTruth[normalizePackageName(name)];
    try {
      const resolvedFile = resolver.resolve(spec, { paths: [directory] });
      const installed = await nearestPackageJson(resolvedFile, name, directory);
      out.push({
        spec,
        name,
        declared: true,
        resolved: true,
        lockVersion: truth?.lockVersion,
        installedVersion: typeof installed?.version === "string" ? installed.version : truth?.installedVersion,
      });
    } catch (error) {
      out.push({
        spec,
        name,
        declared: true,
        resolved: false,
        lockVersion: truth?.lockVersion,
        installedVersion: truth?.installedVersion,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return out;
}

export function detectDependencyAdditions(change: {
  filePath: string;
  addedText: string;
  removedText?: string;
  source: string;
}, existingNames: string[]): AddedDependencyEvidence[] {
  const file = change.filePath.replaceAll("\\", "/").toLowerCase();
  const existing = new Set(existingNames.map(normalizePackageName));
  const out: AddedDependencyEvidence[] = [];
  const seen = new Set<string>();

  const add = (name: string, value: string | undefined, section: AddedDependencyEvidence["section"]) => {
    const clean = name.trim();
    if (!clean || existing.has(normalizePackageName(clean)) || seen.has(`${section}:${clean}`)) return;
    seen.add(`${section}:${clean}`);
    out.push({ name: clean, value, section });
  };

  if (file === "package.json") {
    if (change.source === "write") {
      try {
        const parsed = JSON.parse(change.addedText) as Record<string, unknown>;
        for (const [section, values] of packageSections(parsed)) {
          for (const [name, value] of Object.entries(values)) add(name, typeof value === "string" ? value : undefined, section);
        }
      } catch {}
    } else {
      let section: AddedDependencyEvidence["section"] = "unknown";
      for (const line of change.addedText.split(/\r?\n/)) {
        const header = /^\s*"?(dependencies|devDependencies|peerDependencies|optionalDependencies)"?\s*:/.exec(line);
        if (header) section = header[1] as AddedDependencyEvidence["section"];
        const match = /^\s*"([^"]+)"\s*:\s*"([^"]+)"/.exec(line);
        if (match && section !== "unknown") add(match[1]!, match[2]!, section);
      }
    }
    return out;
  }

  if (file === "requirements.txt" || file === "requirements-dev.txt" || file === "requirements.in" || file === "requirements-dev.in") {
    for (const line of change.addedText.split(/\r?\n/)) {
      const m = /^\s*([A-Za-z0-9][A-Za-z0-9_.-]*)\s*(.*)$/.exec(line);
      if (m && !line.trim().startsWith("#") && !line.trim().startsWith("-")) add(m[1]!, m[2]?.trim(), "python");
    }
  } else if (file === "go.mod") {
    for (const line of change.addedText.split(/\r?\n/)) {
      const m = /^\s*([A-Za-z0-9][^\s]+)\s+(v\S+)/.exec(line);
      if (m) add(m[1]!, m[2]!, "go");
    }
  } else if (file === "cargo.toml") {
    let active = false;
    for (const line of change.addedText.split(/\r?\n/)) {
      const header = /^\s*\[([^\]]+)\]/.exec(line)?.[1] ?? "";
      if (header) active = /^(?:.+\.)?(?:dev-)?build-?dependencies$|^dependencies$/.test(header);
      if (!active) continue;
      const m = /^\s*([A-Za-z0-9_-]+)\s*=\s*(.+)$/.exec(line);
      if (m) add(m[1]!, m[2]!, "rust");
    }
  } else if (file === "pubspec.yaml") {
    let active = false;
    for (const line of change.addedText.split(/\r?\n/)) {
      const header = /^(dependencies|dev_dependencies):\s*$/.exec(line.trim())?.[1];
      if (header) { active = true; continue; }
      if (active && /^\S/.test(line)) active = false;
      const m = /^\s{2,}([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
      if (active && m) add(m[1]!, m[2]!, "dart");
    }
  }

  return out;
}

export async function discoverDependencies(directory: string): Promise<DependencyInventory> {
  const javascript = new Set<string>();
  const python = new Set<string>();
  const go = new Set<string>();
  const rust = new Set<string>();
  const dart = new Set<string>();
  const javascriptTruth: Record<string, JavaScriptPackageTruth> = {};
  const manifestIssues: string[] = [];

  const packageJsonText = await textFile(join(directory, "package.json"));
  const packageJson = packageJsonText ? await jsonFile(join(directory, "package.json")) : undefined;
  const packageLockText = await textFile(join(directory, "package-lock.json"));
  const packageLock = packageLockText ? await jsonFile(join(directory, "package-lock.json")) : undefined;

  if (packageJsonText && packageJson) {
    for (const [section, values] of packageSections(packageJson)) {
      for (const [name, value] of Object.entries(values)) {
        javascript.add(name);
        javascriptTruth[name] = {
          name,
          declaredRange: typeof value === "string" ? value : undefined,
        };
        const lock = packageLockEntry(packageLock, name);
        if (typeof lock?.version === "string") javascriptTruth[name]!.lockVersion = lock.version;
      }
      void section;
    }
  }
  if (packageJson && packageLock) manifestIssues.push(...comparePackageManifest(packageJson, packageLock));

  if (packageJsonText) {
    const resolver = createRequire(join(directory, "__open_disipline_resolver__.cjs"));
    for (const name of javascript) {
      try {
        const resolvedFile = resolver.resolve(name, { paths: [directory] });
        const installed = await nearestPackageJson(resolvedFile, name, directory);
        if (installed && typeof installed.version === "string") javascriptTruth[name]!.installedVersion = installed.version;
        javascriptTruth[name]!.resolved = true;
      } catch {
        javascriptTruth[name]!.resolved = false;
      }
    }
  }

  for (const file of ["requirements.txt","requirements-dev.txt","requirements-dev.in","requirements.in"]) {
    const text = await textFile(join(directory, file));
    if (text) {
      for (const line of text.split(/\r?\n/)) {
        const clean = line.trim();
        if (!clean || clean.startsWith("#") || clean.startsWith("-")) continue;
        const m = /^([A-Za-z0-9][A-Za-z0-9_.-]*)/.exec(clean);
        if (m) python.add(m[1]!.toLowerCase().replace(/_/g, "-"));
      }
    }
  }
  const pyproject = await textFile(join(directory, "pyproject.toml"));
  if (pyproject) {
    for (const m of pyproject.matchAll(/["']([A-Za-z0-9][A-Za-z0-9_.-]*)\s*(?:[<>=!~]|$)/g)) {
      python.add(m[1]!.toLowerCase().replace(/_/g, "-"));
    }
  }

  const goMod = await textFile(join(directory, "go.mod"));
  if (goMod) {
    for (const m of goMod.matchAll(/^\s*require\s+([^\s(]+)\s+/gm)) go.add(m[1]!);
    for (const block of goMod.matchAll(/require\s*\(([^)]*)\)/gs)) {
      for (const m of block[1]!.matchAll(/^\s*([^\s]+)\s+v/gm)) go.add(m[1]!);
    }
  }

  const cargo = await textFile(join(directory, "Cargo.toml"));
  if (cargo) {
    let active = "";
    for (const line of cargo.split(/\r?\n/)) {
      const header = /^\s*\[([^\]]+)\]/.exec(line)?.[1] ?? "";
      if (header) active = header;
      if (/^(?:.+\.)?(?:dev-)?build-?dependencies$|^dependencies$/.test(active)) {
        const m = /^\s*([A-Za-z0-9_-]+)\s*=/.exec(line);
        if (m) rust.add(m[1]!);
      }
    }
  }

  const pubspec = await textFile(join(directory, "pubspec.yaml"));
  if (pubspec) {
    let active = false;
    for (const line of pubspec.split(/\r?\n/)) {
      if (/^(dependencies|dev_dependencies):\s*$/.test(line.trim())) { active = true; continue; }
      if (active && /^\S/.test(line)) active = false;
      const m = /^\s{2,}([A-Za-z0-9_-]+):/.exec(line);
      if (active && m) dart.add(m[1]!);
    }
  }

  return { javascript: [...javascript], python: [...python], go: [...go], rust: [...rust], dart: [...dart], javascriptTruth, manifestIssues };
}
