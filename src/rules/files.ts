import type { DisciplineRule } from "../core/rules.ts";
import { matchesPath } from "../scanners/paths.ts";
export const protectedFilesRule:DisciplineRule={
 id:"protected-files",
 category:"safety",
 defaultSeverity:"block",
 contract:{
  evidence:"The target write path matches a project-configured protected path.",
  legitimateException:"A path is a legitimate exception only when it is not listed in protectedPaths; guardrail core paths are protected independently by the plugin.",
  bypassAnalysis:"Changing the path spelling or splitting a write does not change protection when the path matcher recognizes the target; alternate shell writes are covered separately by the destructive-command guard.",
  testRequirements:{
   positive:"Block a configured protected path in strict mode.",
   negative:"Allow an unrelated path.",
   exception:"Allow a path after it is removed from protectedPaths while preserving core-integrity protection.",
  },
 },
 check(ctx){
  if(!ctx.config.protectedPaths.length||!matchesPath(ctx.filePath,ctx.config.protectedPaths))return[];
  return[{rule:"protected-files",severity:ctx.config.mode==="strict"?"block":"warn",message:`Protected path violation: \`${ctx.filePath}\` is covered by protectedPaths.`,evidence:`path:${ctx.filePath}`}];
 }
};