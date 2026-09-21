import type { DisciplineRule } from "../core/rules.ts";
import { matchesPath } from "../scanners/paths.ts";
export const protectedFilesRule:DisciplineRule={id:"protected-files",check(ctx){if(!ctx.config.protectedPaths.length||!matchesPath(ctx.filePath,ctx.config.protectedPaths))return[];return[{rule:"protected-files",severity:ctx.config.mode==="strict"?"block":"warn",message:`Protected path violation: \`${ctx.filePath}\` is covered by protectedPaths.`}];}};
