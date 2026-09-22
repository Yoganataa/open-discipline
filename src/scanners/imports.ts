import { getExtension } from "./paths.ts";

export function extractImports(filePath: string, text: string): string[] {
  const ext = getExtension(filePath);
  const out = new Set<string>();

  const add = (value: string) => {
    const v = value.trim();
    if (v) out.add(v);
  };

  if ([".ts",".tsx",".js",".jsx",".mjs",".cjs"].includes(ext)) {
    for (const m of text.matchAll(/\b(?:import\s+(?:[^"'\n]+?\s+from\s+)?|export\s+[^"'\n]+?\s+from\s+|require\s*\(|import\s*\()\s*["']([^"']+)["']/g)) add(m[1]!);
  } else if ([".py",".pyi"].includes(ext)) {
    for (const m of text.matchAll(/^\s*(?:from|import)\s+([A-Za-z_][\w.]*)/gm)) add(m[1]!);
  } else if (ext === ".go") {
    for (const m of text.matchAll(/"([^"]+)"/g)) {
      if (m[1]!.includes("/")) add(m[1]!);
    }
  } else if (ext === ".rs") {
    for (const m of text.matchAll(/\b(?:use|extern\s+crate)\s+([A-Za-z_][\w-]*)/g)) add(m[1]!);
  } else if (ext === ".dart") {
    for (const m of text.matchAll(/\bimport\s+["']([^"']+)["']/g)) add(m[1]!);
  } else if ([".kt",".kts",".java",".cs",".swift"].includes(ext)) {
    for (const m of text.matchAll(/^\s*import\s+([A-Za-z_][\w.$]*(?:\.[A-Za-z_][\w$]*)*)/gm)) add(m[1]!);
  } else if ([".c",".h",".cc",".cpp",".cxx",".hpp"].includes(ext)) {
    for (const m of text.matchAll(/^\s*#\s*include\s*[<"]([^">]+)[">]/gm)) add(m[1]!);
  }

  return [...out];
}
