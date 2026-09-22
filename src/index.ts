import type { Plugin } from "@opencode-ai/plugin";
import { loadConfig, type NamingDisciplineConfig } from "./config.ts";
import { buildPolicyContext } from "./context/policy.ts";
import { RuleRegistry } from "./core/rules.ts";
import { namingRule } from "./rules/naming.ts";
import { slopRule } from "./rules/slop.ts";
import { protectedFilesRule } from "./rules/files.ts";
import { changeSurfaceRule, testIntegrityRule, testEvidenceRule, scopeIntentRule } from "./rules/changes.ts";
import { extractChanges } from "./scanners/patch.ts";
import { extractImports } from "./scanners/imports.ts";
import { matchesPath, normalizePath } from "./scanners/paths.ts";
import { suppressionRule } from "./rules/suppressions.ts";
import { guardShellCommand, isValidationCommand, validationKey } from "./runtime/command.ts";
import { createSessionState } from "./runtime/session-state.ts";
import { architectureRule } from "./rules/architecture.ts";
import { dependencyTruthRule } from "./rules/dependencies.ts";
import { detectDependencyAdditions, discoverDependencies, inspectJavascriptImports } from "./runtime/project.ts";
import { captureLatestUserIntent } from "./runtime/intent.ts";

const FILE_TOOLS=new Set(["write","edit","apply_patch"]);
const SHELL_TOOLS=new Set(["bash","sh","zsh","fish","powershell","pwsh","cmd","shell"]);
const CORE_INTEGRITY_PATHS=["discipline.config.json","src/index.ts","src/config.ts","src/core/**","src/rules/**","src/scanners/**",".opencode/plugins/open-discipline.ts",".opencode/plugins/**",".git/**"];
function isCoreIntegrityPath(path:string){return matchesPath(path,CORE_INTEGRITY_PATHS);}

export const OpenDiscipline:Plugin=async({directory,client})=>{
 const config:NamingDisciplineConfig=await loadConfig(directory);
 const dependencyInventory=config.dependencyTruth.enabled?await discoverDependencies(directory):undefined;
 const registry=new RuleRegistry();
 registry.register(protectedFilesRule);registry.register(namingRule);registry.register(slopRule);registry.register(testIntegrityRule);registry.register(testEvidenceRule);registry.register(suppressionRule);registry.register(changeSurfaceRule);registry.register(scopeIntentRule);
 if(config.architecture.enabled)registry.register(architectureRule);
 if(config.dependencyTruth.enabled)registry.register(dependencyTruthRule);
 const sessionStates=new Map<string,ReturnType<typeof createSessionState>>();
 const getState=(sessionID:string)=>{let state=sessionStates.get(sessionID);if(!state){state=createSessionState();sessionStates.set(sessionID,state);}return state;};
 const commandPatterns=config.commandGuards.flatMap(source=>{try{return[{source,regex:new RegExp(source)}];}catch{console.warn("[open-discipline] Invalid command guard skipped: "+source);return[];}});

 return {
  "experimental.chat.messages.transform":async(_input,output)=>{
   const firstIntent=captureInitialUserIntent(output);
   if(firstIntent){const state=getState(firstIntent.sessionID);if(!state.taskIntent)state.taskIntent=firstIntent;}
   if(!config.enabled||!config.context.enabled||!output.messages.length)return;
   const firstUser=output.messages.find(message=>message.info.role==="user");if(!firstUser||!firstUser.parts.length)return;
   if(firstUser.parts.some(part=>part.type==="text"&&part.text.includes("[Open Disipline engineering policy]")))return;
   const context=buildPolicyContext(config);if(!context)return;
   const firstText=firstUser.parts.find(part=>part.type==="text");if(!firstText)return;
   firstUser.parts.unshift({...firstText,text:context});
  },
  "tool.execute.before":async(input,output)=>{
   if(!config.enabled)return;
   if(SHELL_TOOLS.has(input.tool)){
    const args=output.args as Record<string,unknown>;const command=typeof args.command==="string"?args.command:"";if(!command)return;
    const destructive=guardShellCommand(command,CORE_INTEGRITY_PATHS);
    if(destructive){const message="[open-discipline] "+destructive.severity.toUpperCase()+": "+destructive.message;if(destructive.severity==="block"&&config.mode==="strict")throw new Error(message);console.warn(message);}
    for(const guard of commandPatterns){guard.regex.lastIndex=0;if(!guard.regex.test(command))continue;const message="[open-discipline] "+(config.mode==="strict"?"BLOCK":"WARN")+": command matches configured guard: "+guard.source;if(config.mode==="strict")throw new Error(message);console.warn(message);}
    if(isValidationCommand(command)){const state=getState(input.sessionID);state.validationAttempted++;const key=validationKey(command);if(state.lastValidationKey===key)state.repeatedValidation++;else state.repeatedValidation=0;state.lastValidationKey=key;if(state.repeatedValidation>=2)console.warn("[open-discipline] validation-repetition: the same validation command has been attempted repeatedly. Stop looping and inspect the original failure/root cause before retrying.");}
    return;
   }
   if(input.tool==="read"&&config.readProtection.enabled){
    const args=output.args as Record<string,unknown>;const path=typeof args.filePath==="string"?args.filePath:"";
    if(path&&matchesPath(path,config.readProtection.paths)&&!matchesPath(path,config.readProtection.allowPaths))throw new Error("[open-discipline] BLOCK: protected-file read: "+path);
    return;
   }
   if(!FILE_TOOLS.has(input.tool))return;
   const changes=extractChanges(input.tool,output.args as Record<string,unknown>);if(!changes.length)return;
   const guarded=changes.filter(change=>!matchesPath(change.filePath,config.allow.paths));
   const integrityChange=guarded.find(change=>isCoreIntegrityPath(change.filePath));
   if(integrityChange)throw new Error("[open-discipline] BLOCK: guardrail implementation/configuration is protected from agent modification: "+integrityChange.filePath);
   const state=getState(input.sessionID);state.changed=true;
   state.codeChanged ||= guarded.some(change=>config.codeFileExtensions.includes(change.filePath.slice(change.filePath.lastIndexOf("."))));
   state.testChanged ||= guarded.some(change=>config.testIntegrity.paths.some(pattern=>matchesPath(change.filePath,[pattern])));
   const files=[...new Set(guarded.map(change=>normalizePath(change.filePath)))];
   const testFiles=files.filter(file=>config.testIntegrity.paths.some(pattern=>matchesPath(file,[pattern])));
   const codeFiles=files.filter(file=>config.codeFileExtensions.includes(file.slice(file.lastIndexOf("."))));
   const findings=[];
   for(let index=0;index<guarded.length;index++){
    const change=guarded[index]!;
    const dependencyAdditions=dependencyInventory?detectDependencyAdditions(change,[...dependencyInventory.javascript,...dependencyInventory.python,...dependencyInventory.go,...dependencyInventory.rust,...dependencyInventory.dart]):[];
    if(dependencyAdditions.length)for(const addition of dependencyAdditions)findings.push({rule:"dependency-change",severity:"warn" as const,message:"New dependency \"" + addition.name + "\" is being introduced in " + change.filePath + ". Verify that it is required for the requested behavior, that an existing project dependency cannot provide it, and that the chosen API is supported locally.",evidence:addition.section+": "+addition.name+(addition.value?"@"+addition.value:"")});
    const dependencyEvidence=/\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(change.filePath)&&dependencyInventory
      ?await inspectJavascriptImports(directory,extractImports(change.filePath,change.addedText),dependencyInventory):undefined;
    findings.push(...registry.runAll({filePath:change.filePath,addedText:change.addedText,removedText:change.removedText,deleted:change.deleted,config,changeFiles:files,testFiles,codeFiles,changeIndex:index,dependencyInventory,dependencyEvidence,dependencyAdditions,taskIntent:state.taskIntent}));
   }
   const blocking=findings.filter(f=>f.severity==="block");const warnings=findings.filter(f=>f.severity==="warn");
   for(const warning of warnings)console.warn("[open-discipline] "+warning.rule+"\n"+warning.message);
   if(blocking.length)throw new Error(blocking.map(f=>f.message).join("\n\n---\n\n"));
  },
  "command.execute.before":async(input)=>{
   if(!config.enabled)return;const state=getState(input.sessionID);
   const destructive=guardShellCommand(input.command,CORE_INTEGRITY_PATHS);
   if(destructive){const message="[open-discipline] "+destructive.severity.toUpperCase()+": "+destructive.message;if(destructive.severity==="block"&&config.mode==="strict")throw new Error(message);console.warn(message);}
   for(const guard of commandPatterns){guard.regex.lastIndex=0;if(!guard.regex.test(input.command))continue;const message="[open-discipline] "+(config.mode==="strict"?"BLOCK":"WARN")+": command matches configured guard: "+guard.source;if(config.mode==="strict")throw new Error(message);console.warn(message);}
   if(!isValidationCommand(input.command))return;state.validationAttempted++;const key=validationKey(input.command);if(state.lastValidationKey===key)state.repeatedValidation++;else state.repeatedValidation=0;state.lastValidationKey=key;if(state.repeatedValidation>=2)console.warn("[open-discipline] validation-repetition: the same validation command has been attempted repeatedly. Stop looping and inspect the original failure/root cause before retrying.");
  },
  "event":async({event})=>{
   const type=(event as {type?:string}).type??"";const payload=event as {properties?:Record<string,unknown>};const sessionID=typeof payload.properties?.sessionID==="string"?payload.properties.sessionID:"";if(!sessionID)return;
   const state=getState(sessionID);
   if(type==="session.idle"&&state.codeChanged&&!state.validationAttempted&&!state.completionWarned){state.completionWarned=true;console.warn("[open-discipline] completion-evidence: code changed without a detected validation command. Run the relevant test/typecheck/lint/build validation before considering the task complete.");}
   if(type==="session.idle")sessionStates.delete(sessionID);
  },
  "permission.ask":async(input,output)=>{
   if(!config.enabled||!config.readProtection.enabled||input.type!=="read")return;const path=typeof input.pattern==="string"?input.pattern:"";
   if(!path||!matchesPath(path,config.readProtection.paths)||matchesPath(path,config.readProtection.allowPaths))return;output.status="deny";
   try{await client.app.log({body:{service:"open-disipline",level:"warn",message:"Blocked protected-file read",extra:{path}}});}catch{}
  },
 };
};
export default OpenDiscipline;
