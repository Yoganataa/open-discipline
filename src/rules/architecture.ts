import type { DisciplineRule, RuleContext, RuleFinding } from "../core/rules.ts";
import { extractImports } from "../scanners/imports.ts";
import { matchesPath } from "../scanners/paths.ts";
export const architectureRule:DisciplineRule={id:"architecture",category:"architecture",defaultSeverity:"block",contract:{evidence:"A configured source boundary imports a module matching one of its denied import patterns.",legitimateException:"Only explicitly changed architecture configuration can establish an exception; unknown architecture is not inferred.",bypassAnalysis:"String matching can miss aliases or generated resolution; this rule intentionally enforces only explicit configured boundaries.",testRequirements:{positive:"Block a configured denied import.",negative:"Allow imports outside denied patterns.",exception:"Allow a source path with no matching configured boundary.}},check(ctx:RuleContext):RuleFinding[]{
 const rules=ctx.config.architecture.rules;if(!rules.length)return[];const findings:RuleFinding[]=[];
 for(const spec of extractImports(ctx.filePath,ctx.addedText)) for(const rule of rules){
  if(!matchesPath(ctx.filePath,[rule.from]))continue;
  if(!rule.denyImports.some((pattern)=>spec.startsWith(pattern)||matchesPath(spec,[pattern])))continue;
  findings.push({rule:"architecture",severity:ctx.config.mode==="strict"?"block":"warn",message:"Architecture boundary violated: "+ctx.filePath+" imports \"" + spec + "\" denied by the configured boundary from \"" + rule.from + "\". Use the intended layer instead of bypassing it."});
 } return findings;}};