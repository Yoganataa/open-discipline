import type { NamingDisciplineConfig, Severity } from "../config.ts";
import type { DependencyImportEvidence, DependencyInventory } from "../runtime/project.ts";

export interface RuleContext {
  filePath:string;
  addedText:string;
  removedText?:string;
  deleted?:boolean;
  config:NamingDisciplineConfig;
  changeFiles?:string[];
  testFiles?:string[];
  codeFiles?:string[];
  changeIndex?:number;
  dependencyInventory?:DependencyInventory;
  dependencyEvidence?:DependencyImportEvidence[];
  dependencyAdditions?:{name:string;value?:string;section:string}[];
}
export interface RuleFinding {
  rule:string;
  severity:Severity;
  message:string;
  evidence?:string;
}
export interface DisciplineRule {
  id:string;
  category?:"safety"|"integrity"|"scope"|"dependency"|"architecture"|"quality"|"naming";
  defaultSeverity?:Severity;
  check(ctx:RuleContext):RuleFinding[];
}
export class RuleRegistry {
  private readonly rules:DisciplineRule[]=[];
  register(rule:DisciplineRule){this.rules.push(rule);}
  runAll(ctx:RuleContext):RuleFinding[]{
    const seen=new Set<string>(); const out:RuleFinding[]=[];
    for(const rule of this.rules){
      try{
        for(const finding of rule.check(ctx)){
          const key=[finding.rule,finding.severity,finding.message].join("\0");
          if(seen.has(key)) continue;
          seen.add(key); out.push(finding);
        }
      }catch(error){
        const message=error instanceof Error?error.message:String(error);
        const key=[rule.id,"warn",message].join("\0");
        if(!seen.has(key)){
          seen.add(key);
          out.push({rule:rule.id,severity:"warn",message:`Rule "${rule.id}" failed safely and was skipped: ${message}`});
        }
      }
    }
    return out;
  }
}
