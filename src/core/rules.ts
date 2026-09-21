import type { NamingDisciplineConfig, Severity } from "../config.ts";
export interface RuleContext { filePath: string; addedText: string; config: NamingDisciplineConfig; }
export interface RuleFinding { rule: string; severity: Severity; message: string; }
export interface DisciplineRule { id: string; check(ctx: RuleContext): RuleFinding[]; }
export class RuleRegistry {
  private readonly rules: DisciplineRule[] = [];
  register(rule: DisciplineRule): void { this.rules.push(rule); }
  runAll(ctx: RuleContext): RuleFinding[] {
    const out: RuleFinding[] = [];
    for (const rule of this.rules) {
      try { out.push(...rule.check(ctx)); }
      catch (error) { out.push({ rule: rule.id, severity: "warn", message: `Rule "${rule.id}" failed safely and was skipped: ${error instanceof Error ? error.message : String(error)}` }); }
    }
    return out;
  }
}
