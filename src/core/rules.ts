import type { NamingDisciplineConfig, Severity } from "../config.ts";
import type { DependencyImportEvidence, DependencyInventory } from "../runtime/project.ts";
import type { TaskIntent } from "../runtime/intent.ts";

export type RuleCategory = "safety"|"integrity"|"scope"|"dependency"|"architecture"|"quality"|"naming";

export interface RuleTestRequirements {
  positive:string;
  negative:string;
  exception:string;
}

export interface RuleContract {
  evidence:string;
  legitimateException:string;
  bypassAnalysis:string;
  testRequirements:RuleTestRequirements;
}

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
  taskIntent?:TaskIntent;
  priorRegressionTestEvidence?:boolean;
}

export interface RuleFinding {
  rule:string;
  severity:Severity;
  message:string;
  evidence?:string;
}

export interface DisciplineRule {
  id:string;
  category:RuleCategory;
  defaultSeverity:Exclude<Severity,"allow">;
  contract:RuleContract;
  check(ctx:RuleContext):RuleFinding[];
}

const requiredText=(value:unknown)=>typeof value==="string"&&value.trim().length>0;

export function validateRuleContract(rule:DisciplineRule):string[]{
  const errors:string[]=[];
  if(!requiredText(rule.id))errors.push("id");
  if(!requiredText(rule.category))errors.push("category");
  if(!requiredText(rule.defaultSeverity))errors.push("defaultSeverity");
  if(!rule.contract)errors.push("contract");
  else{
    if(!requiredText(rule.contract.evidence))errors.push("contract.evidence");
    if(!requiredText(rule.contract.legitimateException))errors.push("contract.legitimateException");
    if(!requiredText(rule.contract.bypassAnalysis))errors.push("contract.bypassAnalysis");
    const tests=rule.contract.testRequirements;
    if(!tests)errors.push("contract.testRequirements");
    else{
      if(!requiredText(tests.positive))errors.push("contract.testRequirements.positive");
      if(!requiredText(tests.negative))errors.push("contract.testRequirements.negative");
      if(!requiredText(tests.exception))errors.push("contract.testRequirements.exception");
    }
  }
  return errors;
}

export class RuleRegistry {
  private readonly rules:DisciplineRule[]=[];
  register(rule:DisciplineRule){
    const errors=validateRuleContract(rule);
    if(errors.length)throw new Error(`Invalid rule contract for "${rule.id||"<unknown>"}": missing ${errors.join(", ")}`);
    if(this.rules.some(existing=>existing.id===rule.id))throw new Error(`Duplicate discipline rule id: "${rule.id}"`);
    this.rules.push(rule);
  }
  runAll(ctx:RuleContext):RuleFinding[]{
    const seen=new Set<string>(); const out:RuleFinding[]=[];
    for(const rule of this.rules){
      try{
        for(const finding of rule.check(ctx)){
          if(finding.severity!=="allow"&&!requiredText(finding.evidence)){
            const contractFinding:RuleFinding={
              rule:"rule-contract",
              severity:"warn",
              message:`Rule "${rule.id}" emitted a finding without observable evidence. The finding was suppressed until the rule supplies evidence matching its contract.`,
              evidence:`rule:${rule.id}`,
            };
            const contractKey=[contractFinding.rule,contractFinding.severity,contractFinding.message].join("\0");
            if(!seen.has(contractKey)){seen.add(contractKey);out.push(contractFinding);}
            continue;
          }
          const key=[finding.rule,finding.severity,finding.message].join("\0");
          if(seen.has(key))continue;
          seen.add(key);
          out.push(finding);
        }
      }catch(error){
        const message=error instanceof Error?error.message:String(error);
        const key=[rule.id,"warn",message].join("\0");
        if(!seen.has(key)){
          seen.add(key);
          out.push({
            rule:rule.id,
            severity:"warn",
            message:`Rule "${rule.id}" failed safely and was skipped: ${message}`,
            evidence:`rule:${rule.id}`,
          });
        }
      }
    }
    return out;
  }
}
