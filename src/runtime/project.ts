import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface DependencyInventory {
  javascript: string[];
  python: string[];
  go: string[];
  rust: string[];
  dart: string[];
}

async function textFile(path: string): Promise<string | undefined> {
  try { return await readFile(path, "utf8"); } catch { return undefined; }
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

function pythonRequirementNames(text: string): string[] {
  const out = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#") || clean.startsWith("-")) continue;
    const m = /^([A-Za-z0-9][A-Za-z0-9_.-]*)/.exec(clean);
    if (m) out.add(m[1]!.toLowerCase().replace(/_/g, "-"));
  }
  for (const m of text.matchAll(/["']([A-Za-z0-9][A-Za-z0-9_.-]*)\s*(?:[<>=!~]|$)/g)) {
    out.add(m[1]!.toLowerCase().replace(/_/g, "-"));
  }
  return [...out];
}

function sectionKeys(text: string, sections: RegExp[]): string[] {
  const out = new Set<string>();
  let active = false;
  for (const line of text.split(/\r?\n/)) {
    const heading = /^\s*\[([^\]]+)\]/.exec(line)?.[1] ?? "";
    if (heading) active = sections.some((re) => re.test(heading));
    if (!active) continue;
    const m = /^\s*([A-Za-z0-9_.-]+)\s*=/.exec(line);
    if (m) out.add(m[1]!);
  }
  return [...out];
}

export async function discoverDependencies(directory: string): Promise<DependencyInventory> {
  const javascript = new Set<string>();
  const python = new Set<string>();
  const go = new Set<string>();
  const rust = new Set<string>();
  const dart = new Set<string>();

  const packageJson = await textFile(join(directory, "package.json"));
  if (packageJson) for (const d of keysFromPackageJson(packageJson)) javascript.add(d);

  for (const file of ["requirements.txt","requirements-dev.txt","requirements-dev.in","requirements.in"]) {
    const text = await textFile(join(directory, file));
    if (text) for (const d of pythonRequirementNames(text)) python.add(d);
  }
  const pyproject = await textFile(join(directory, "pyproject.toml"));
  if (pyproject) for (const d of pythonRequirementNames(pyproject)) python.add(d);

  const goMod = await textFile(join(directory, "go.mod"));
  if (goMod) {
    for (const m of goMod.matchAll(/^\s*require\s+([^\s(]+)\s+/gm)) go.add(m[1]!);
    for (const block of goMod.matchAll(/require\s*\(([^)]*)\)/gs)) {
      for (const m of block[1]!.matchAll(/^\s*([^\s]+)\s+v/gm)) go.add(m[1]!);
    }
  }

  const cargo = await textFile(join(directory, "Cargo.toml"));
  if (cargo) {
    for (const d of sectionKeys(cargo, [/^dependencies$/,/^dev-dependencies$/,/^build-dependencies$/,/\.dependencies$/])) rust.add(d);
  }

  const pubspec = await textFile(join(directory, "pubspec.yaml"));
  if (pubspec) {
    let active = false;
    for (const line of pubspec.split(/\r?\n/)) {
      if (/^(dependencies|dev_dependencies):\s*$/.test(line.trim())) { active = true; continue; }
      if (active && /^\S/.test(line) && !/^(dependencies|dev_dependencies):/.test(line)) { active = false; continue; }
      const m = /^\s{2,}([A-Za-z0-9_-]+):/.exec(line);
      if (active && m) dart.add(m[1]!);
    }
  }

  return {
    javascript: [...javascript],
    python: [...python],
    go: [...go],
    rust: [...rust],
    dart: [...dart],
  };
}
