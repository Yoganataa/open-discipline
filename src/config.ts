import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { homedir } from "node:os";

export type Mode = "strict" | "advisory";
export type Severity = "block" | "warn" | "allow";

export interface NamingDisciplineConfig {
  enabled: boolean;
  mode: Mode;
  brands: string[];
  caseSensitive: boolean;
  autoBrands: boolean;
  context: {
    enabled: boolean;
    includeOnSubsessions: boolean;
    maxCharacters: number;
  };
  allow: {
    identifiers: string[];
    patterns: string[];
    paths: string[];
    suffixes: string[];
  };
  warn: {
    patterns: string[];
    ambiguousSuffixes: string[];
  };
  block: {
    patterns: string[];
  };
  codeFileExtensions: string[];
  ignoreExtensions: string[];
  qualifierSuggestions: Record<string, string[]>;
  protectedPaths: string[];
  commandGuards: string[];
}

export const DEFAULT_CONFIG: NamingDisciplineConfig = {
  enabled: true,
  mode: "strict",
  brands: [],
  caseSensitive: false,
  autoBrands: true,
  context: {
    enabled: true,
    includeOnSubsessions: false,
    maxCharacters: 5000,
  },
  allow: {
    identifiers: [],
    patterns: [
      "^[A-Za-z][A-Za-z0-9+.-]*://",
      "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*){2,}$",
    ],
    paths: ["node_modules/**", "dist/**", "build/**", ".git/**"],
    suffixes: ["SDK", "API", "CLI"],
  },
  warn: {
    patterns: [],
    ambiguousSuffixes: ["Client", "Manager", "Service", "Handler", "Helper", "Wrapper", "Adapter"],
  },
  block: {
    patterns: [],
  },
  codeFileExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".go", ".py", ".kt"],
  ignoreExtensions: [".md", ".mdx", ".txt", ".json", ".jsonc", ".yml", ".yaml", ".lock"],
  qualifierSuggestions: {
    Settings: ["Account", "Server", "Device", "Application"],
    Client: ["Http", "Api", "Database", "Storage"],
    Manager: ["Session", "Connection", "Resource", "State"],
    Service: ["Payment", "Notification", "Auth", "Sync"],
  },
  protectedPaths: [],
  commandGuards: [],
};

function cloneDefault(): NamingDisciplineConfig {
  return structuredClone(DEFAULT_CONFIG);
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every((x) => typeof x === "string") ? value : fallback;
}

function validateConfig(input: unknown): Partial<NamingDisciplineConfig> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const value = input as Record<string, unknown>;
  const context = value.context && typeof value.context === "object" && !Array.isArray(value.context)
    ? value.context as Record<string, unknown>
    : {};
  const allow = value.allow && typeof value.allow === "object" && !Array.isArray(value.allow)
    ? value.allow as Record<string, unknown>
    : {};
  const warn = value.warn && typeof value.warn === "object" && !Array.isArray(value.warn)
    ? value.warn as Record<string, unknown>
    : {};
  const block = value.block && typeof value.block === "object" && !Array.isArray(value.block)
    ? value.block as Record<string, unknown>
    : {};
  const suggestions = value.qualifierSuggestions && typeof value.qualifierSuggestions === "object" && !Array.isArray(value.qualifierSuggestions)
    ? value.qualifierSuggestions as Record<string, unknown>
    : {};

  const normalizedSuggestions: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(suggestions)) {
    normalizedSuggestions[key] = asStringArray(raw, []);
  }

  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : undefined,
    mode: value.mode === "strict" || value.mode === "advisory" ? value.mode : undefined,
    brands: asStringArray(value.brands, []),
    caseSensitive: typeof value.caseSensitive === "boolean" ? value.caseSensitive : undefined,
    autoBrands: typeof value.autoBrands === "boolean" ? value.autoBrands : undefined,
    context: {
      enabled: typeof context.enabled === "boolean" ? context.enabled : DEFAULT_CONFIG.context.enabled,
      includeOnSubsessions: typeof context.includeOnSubsessions === "boolean" ? context.includeOnSubsessions : DEFAULT_CONFIG.context.includeOnSubsessions,
      maxCharacters: typeof context.maxCharacters === "number" && Number.isFinite(context.maxCharacters) && context.maxCharacters >= 500
        ? Math.floor(context.maxCharacters)
        : DEFAULT_CONFIG.context.maxCharacters,
    },
    allow: {
      identifiers: asStringArray(allow.identifiers, DEFAULT_CONFIG.allow.identifiers),
      patterns: asStringArray(allow.patterns, DEFAULT_CONFIG.allow.patterns),
      paths: asStringArray(allow.paths, DEFAULT_CONFIG.allow.paths),
      suffixes: asStringArray(allow.suffixes, DEFAULT_CONFIG.allow.suffixes),
    },
    warn: {
      patterns: asStringArray(warn.patterns, DEFAULT_CONFIG.warn.patterns),
      ambiguousSuffixes: asStringArray(warn.ambiguousSuffixes, DEFAULT_CONFIG.warn.ambiguousSuffixes),
    },
    block: {
      patterns: asStringArray(block.patterns, DEFAULT_CONFIG.block.patterns),
    },
    codeFileExtensions: asStringArray(value.codeFileExtensions, DEFAULT_CONFIG.codeFileExtensions),
    ignoreExtensions: asStringArray(value.ignoreExtensions, DEFAULT_CONFIG.ignoreExtensions),
    qualifierSuggestions: normalizedSuggestions,
    protectedPaths: asStringArray(value.protectedPaths, []),
    commandGuards: asStringArray(value.commandGuards, []),
  };
}

export function mergeConfig(partial?: unknown): NamingDisciplineConfig {
  const base = cloneDefault();
  const normalized = validateConfig(partial);

  if (normalized.enabled !== undefined) base.enabled = normalized.enabled;
  if (normalized.mode !== undefined) base.mode = normalized.mode;
  if (normalized.brands !== undefined) base.brands = normalized.brands;
  if (normalized.caseSensitive !== undefined) base.caseSensitive = normalized.caseSensitive;
  if (normalized.autoBrands !== undefined) base.autoBrands = normalized.autoBrands;
  if (normalized.context) base.context = { ...base.context, ...normalized.context };
  if (normalized.allow) base.allow = { ...base.allow, ...normalized.allow };
  if (normalized.warn) base.warn = { ...base.warn, ...normalized.warn };
  if (normalized.block) base.block = { ...base.block, ...normalized.block };
  if (normalized.codeFileExtensions !== undefined) base.codeFileExtensions = normalized.codeFileExtensions;
  if (normalized.ignoreExtensions !== undefined) base.ignoreExtensions = normalized.ignoreExtensions;
  if (normalized.qualifierSuggestions) base.qualifierSuggestions = { ...base.qualifierSuggestions, ...normalized.qualifierSuggestions };
  if (normalized.protectedPaths !== undefined) base.protectedPaths = normalized.protectedPaths;
  if (normalized.commandGuards !== undefined) base.commandGuards = normalized.commandGuards;

  return base;
}

export async function loadConfig(directory: string, fileName = "discipline.config.json"): Promise<NamingDisciplineConfig> {
  const globalRaw = await readConfigFile(join(homedir(), ".config", "opencode", fileName), false);
  const projectRaw = await readConfigFile(join(directory, fileName), true);
  const config = mergeConfig({ ...(globalRaw ?? {}), ...(projectRaw ?? {}) });
  if (config.autoBrands !== false) {
    config.brands = [...new Set([...config.brands, ...(await detectBrands(directory))])];
  }
  return config;
}

async function readConfigFile(filePath: string, warnOnError: boolean): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (warnOnError && (error as NodeJS.ErrnoException)?.code !== "ENOENT") {
      console.warn(`[open-disipline] Could not load ${filePath}; ignoring.`, error);
    }
    return undefined;
  }
}

function pascalCase(input: string): string {
  const parts = input.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}

/** Derive project-identity brands so the plugin works with zero per-project config. */
export async function detectBrands(directory: string): Promise<string[]> {
  const pkg = (await readConfigFile(join(directory, "package.json"), false)) as { name?: unknown } | undefined;
  const name = typeof pkg?.name === "string" ? pkg.name.trim() : "";
  const candidate = pascalCase(name || basename(directory));
  return candidate ? [candidate] : [];
}
