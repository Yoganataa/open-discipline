import type { Plugin } from "@opencode-ai/plugin";
import { loadConfig, type NamingDisciplineConfig } from "./config.ts";
import { buildPolicyContext } from "./context/policy.ts";
import { RuleRegistry } from "./core/rules.ts";
import { namingRule } from "./rules/naming.ts";
import { slopRule } from "./rules/slop.ts";
import { protectedFilesRule } from "./rules/files.ts";
import { extractChanges } from "./scanners/patch.ts";
import { matchesPath } from "./scanners/paths.ts";
const FILE_TOOLS=new Set(["write","edit","apply_patch"]);
const isSubsession=(id:string)=>id.includes(":");
export const OpenDisipline:Plugin=async({directory})=>{const config:NamingDisciplineConfig=await loadConfig(directory);const registry=new RuleRegistry();registry.register(protectedFilesRule);registry.register(namingRule);registry.register(slopRule);return{
  "experimental.chat.system.transform":async(input,output)=>{if(!config.enabled||!config.context.enabled)return;if(!config.context.includeOnSubsessions&&input.sessionID&&isSubsession(input.sessionID))return;const c=buildPolicyContext(config);if(c)output.system.push(c);},
  "tool.execute.before":async(input,output)=>{if(!config.enabled||!FILE_TOOLS.has(input.tool))return;const changes=extractChanges(input.tool,output.args as Record<string,unknown>);if(!changes.length)return;const findings=[];for(const ch of changes){if(matchesPath(ch.filePath,config.allow.paths))continue;findings.push(...registry.runAll({filePath:ch.filePath,addedText:ch.addedText,config}));}const blocking=findings.filter(x=>x.severity==="block"),warnings=findings.filter(x=>x.severity==="warn");for(const w of warnings)console.warn(`[open-disipline] ${w.rule}\n${w.message}`);if(blocking.length)throw new Error(blocking.map(x=>x.message).join("\n\n---\n\n"));},
  "command.execute.before":async(input)=>{if(!config.enabled||!config.commandGuards.length)return;for(const source of config.commandGuards){try{if(new RegExp(source).test(input.command)){const msg=`[open-disipline] ${config.mode==="strict"?"BLOCK":"WARN"}: command \`${input.command}\` matches guard ${source}`;if(config.mode==="strict")throw new Error(msg);console.warn(msg);}}catch(err){if(err instanceof Error&&err.message.startsWith("[open-disipline]"))throw err;console.warn(`[open-disipline] Invalid command guard skipped: ${source}`);}}}
};};
export default OpenDisipline;
