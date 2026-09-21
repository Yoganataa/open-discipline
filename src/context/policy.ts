import type { NamingDisciplineConfig } from "../config.ts";
export function buildPolicyContext(config: NamingDisciplineConfig): string {
  if (!config.context.enabled) return "";
  const brands = config.brands.length ? config.brands.join(", ") : "(none configured)";
  const text = [
    "[Open Disipline engineering policy]",
    "Use domain-first naming. Do not mechanically prefix internal technical names with a product, company, project, or feature name.",
    "Branding is valid at real boundaries: user-facing identity, external APIs, protocol identifiers, published package coordinates, integrations, and compatibility surfaces.",
    "When names collide, prefer the smallest semantic qualifier that explains the distinction instead of an ownership prefix.",
    `Configured brands: ${brands}.`,
    "A deterministic tool guard may reject proposed writes that violate these rules; correct the implementation rather than bypassing the guard."
  ].join("\n");
  return text.length <= config.context.maxCharacters ? text : text.slice(0, config.context.maxCharacters);
}
