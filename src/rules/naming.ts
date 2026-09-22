import type { NamingDisciplineConfig, Severity } from "../config.ts";
import type { DisciplineRule, RuleContext, RuleFinding } from "../core/rules.ts";
import { extractIdentifiers } from "../scanners/identifiers.ts";
import { basenameToIdentifier, getExtension } from "../scanners/paths.ts";
export interface NamingFinding { identifier:string; severity:Severity; brand:string; remainder:string; reason:string; suggestions:string[]; }
function testPatterns(v:string,pats:string[]):boolean{return pats.some(s=>{try{return new RegExp(s).test(v);}catch{return false;}});}
function matchBrand(id:string,brands:string[],cs:boolean){const h=cs?id:id.toLowerCase();for(const b of brands){const n=cs?b:b.toLowerCase();if(!n)continue;if(h.startsWith(n)){const next=id[n.length];if(!next||/[A-Z_$-.:/]/.test(next))return{brand:b,remainder:id.slice(n.length)};}if(h.endsWith(n)&&id.length>n.length)return{brand:b,remainder:id.slice(0,id.length-n.length)};}return null;}
function suggest(r:string,c:NamingDisciplineConfig){return c.qualifierSuggestions[r]?.map(p=>`${p}${r}`)??(r?[r]:[]);}
function format(findings:NamingFinding[],mode:NamingDisciplineConfig["mode"]){const l=["Open Disipline — naming policy",""];for(const f of findings){l.push(`${f.severity.toUpperCase()}: ${f.reason}`);if(f.suggestions.length)l.push(`  Prefer: ${f.suggestions.join(", ")}`);}l.push("","Branding is allowed at legitimate external or user-facing boundaries.","Use an explicit allow rule for legitimate exceptions.");if(mode==="advisory")l.push("Advisory mode: the operation is not blocked.");return l.join("\n");}
export const namingRule:DisciplineRule={
 id:"naming",
 category:"naming",
 defaultSeverity:"block",
 contract:{
  evidence:"A new internal identifier or file basename matches a configured product/domain brand without sufficient domain meaning.",
  legitimateException:"External or user-facing boundaries and identifiers explicitly covered by allow identifiers, patterns, paths, or suffixes are legitimate exceptions.",
  bypassAnalysis:"Moving the same ownership-shaped name to another guarded declaration or file does not change the evidence; unguarded/generated paths are intentionally outside this rule.",
  testRequirements:{
   positive:"Detect a brand-prefixed or brand-suffixed internal identifier in a guarded source change.",
   negative:"Allow a non-branded identifier and configured generic/external patterns.",
   exception:"Allow an explicitly configured identifier, pattern, path, or suffix.",
  },
 },
 check(ctx){
  if(!ctx.config.enabled||ctx.config.brands.length===0)return[];
  const ext=getExtension(ctx.filePath);
  if(ctx.config.ignoreExtensions.includes(ext))return[];
  const ids:string[]=[];
  const fn=basenameToIdentifier(ctx.filePath);if(fn)ids.push(fn);
  if(ctx.config.codeFileExtensions.includes(ext))ids.push(...extractIdentifiers(ctx.addedText,ext).map(x=>x.name));
  const findings=[...new Set(ids)].map(id=>classifyIdentifier(id,ctx.config)).filter((x):x is NamingFinding=>x!==null);
  if(!findings.length)return[];
  const b=findings.filter(x=>x.severity==="block"),w=findings.filter(x=>x.severity==="warn");const out:RuleFinding[]=[];
  if(b.length)out.push({rule:"naming",severity:ctx.config.mode==="strict"?"block":"warn",message:format(b,ctx.config.mode),evidence:`identifiers:${b.map(x=>x.identifier).join(",")}`});
  if(w.length)out.push({rule:"naming",severity:"warn",message:format(w,ctx.config.mode),evidence:`identifiers:${w.map(x=>x.identifier).join(",")}`});
  return out;
 }
};