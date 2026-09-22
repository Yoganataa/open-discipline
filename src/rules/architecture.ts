import type { DisciplineRule, RuleContext, RuleFinding } from "../core/rules.ts";
import { extractImports } from "../scanners/imports.ts";
import { matchesPath } from "../scanners/paths.ts";
export const architectureRule:DisciplineRule={id:"architecture",check(ctx:RuleContext):RuleFinding[]{
 const rules=ctx.config.architecture.rules;if(!rules.length)return[];const findings:RuleFinding[]=[];
 for(const spec of extractImports(ctx.filePath,ctx.addedText)) for(const rule of rules){
  if(!matchesPath(ctx.filePath,[rule.from]))continue;
  if(!rule.denyImports.some((pattern)=>spec.startsWith(pattern)||matchesPath(spec,[pattern])))continue;
  findings.push({rule:"architecture",severity:ctx.config.mode==="strict"?"block":"warn",message:"Architecture boundary violated: "+ctx.filePath+" imports \"" + spec + "\" denied by the configured boundary from \"" + rule.from + "\". Use the intended layer instead of bypassing it."});
 } return findings;}};