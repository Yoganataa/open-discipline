import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { homedir } from "node:os";

export type Mode = "strict" | "advisory";
export type Severity = "block" | "warn" | "allow";

export interface NamingDisciplineConfig {
  enabled: boolean; mode: Mode; brands: string[]; caseSensitive: boolean; autoBrands: boolean; ignoredAutoBrands: string[];
  context: { enabled: boolean; includeOnSubsessions: boolean; maxCharacters: number };
  allow: { identifiers: string[]; patterns: string[]; paths: string[]; suffixes: string[] };
  warn: { patterns: string[]; ambiguousSuffixes: string[] }; block: { patterns: string[] };
  codeFileExtensions: string[]; ignoreExtensions: string[]; qualifierSuggestions: Record<string, string[]>;
  protectedPaths: string[]; commandGuards: string[];
  readProtection: { enabled: boolean; paths: string[]; allowPaths: string[] };
  testIntegrity: { enabled: boolean; severity: "warn" | "block"; paths: string[] };
  testEvidence: { enabled: boolean; severity: "warn" | "block"; paths: string[] };
  changeSurface: { enabled: boolean; warnAt: number; blockAt: number };
  architecture: { enabled: boolean; rules: { from: string; denyImports: string[] }[] };
  dependencyTruth: { enabled: boolean; severity: "warn" | "block" };
}

export const DEFAULT_CONFIG: NamingDisciplineConfig = {
  enabled:true, mode:"strict", brands:[], caseSensitive:false, autoBrands:true,
  ignoredAutoBrands:["app","application","backend","client","core","desktop","frontend","lib","library","mobile","package","project","repo","repository","server","service","web"],
  context:{enabled:true,includeOnSubsessions:false,maxCharacters:3500},
  allow:{identifiers:[],patterns:["^[A-Za-z][A-Za-z0-9+.-]*://","^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*){2,}$"],paths:["node_modules/**","dist/**","build/**",".git/**","vendor/**","generated/**"],suffixes:["SDK","API","CLI"]},
  warn:{patterns:[],ambiguousSuffixes:["Client","Manager","Service","Handler","Helper","Wrapper","Adapter"]},
  block:{patterns:[]},
  codeFileExtensions:[".ts",".tsx",".js",".jsx",".mjs",".cjs",".go",".py",".pyi",".kt",".kts",".java",".rs",".cs",".fs",".fsx",".dart",".swift",".c",".h",".cc",".cpp",".cxx",".hpp",".xml"],
  ignoreExtensions:[".md",".mdx",".txt",".json",".jsonc",".yml",".yaml",".lock"],
  qualifierSuggestions:{Settings:["Account","Server","Device","Application"],Client:["Http","Api","Database","Storage"],Manager:["Session","Connection","Resource","State"],Service:["Payment","Notification","Auth","Sync"]},
  protectedPaths:[],commandGuards:[],
  readProtection:{enabled:true,paths:[".env",".env.*","**/.env","**/.env.*"],allowPaths:[".env.example",".env.sample",".env.template","**/.env.example","**/.env.sample","**/.env.template"]},
  testIntegrity:{enabled:true,severity:"warn",paths:["tests/**","test/**","**/*.test.*","**/*.spec.*","**/__tests__/**"]},
  testEvidence:{enabled:true,severity:"warn",paths:["tests/**","test/**","**/*.test.*","**/*.spec.*","**/__tests__/**"]},
  changeSurface:{enabled:true,warnAt:25,blockAt:100},
  architecture:{enabled:true,rules:[]},
  dependencyTruth:{enabled:true,severity:"warn"},
};

const isRecord=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const arr=(v:unknown,f:string[])=>Array.isArray(v)&&v.every(x=>typeof x==="string")?v:f;
function deepMerge(a:unknown,b:unknown):unknown{
  if(!isRecord(a)||!isRecord(b))return b===undefined?a:b;
  const r:Record<string,unknown>={...a};
  for(const [k,v] of Object.entries(b))r[k]=k in r?deepMerge(r[k],v):v;
  return r;
}
function section(input:Record<string,unknown>,key:string){return isRecord(input[key])?input[key] as Record<string,unknown>:{};}

export function mergeConfig(input?:unknown):NamingDisciplineConfig{
  const base=structuredClone(DEFAULT_CONFIG);
  if(!isRecord(input))return base;
  if(typeof input.enabled==="boolean")base.enabled=input.enabled;
  if(input.mode==="strict"||input.mode==="advisory")base.mode=input.mode;
  if(Array.isArray(input.brands)&&input.brands.every(x=>typeof x==="string"))base.brands=input.brands;
  if(typeof input.caseSensitive==="boolean")base.caseSensitive=input.caseSensitive;
  if(typeof input.autoBrands==="boolean")base.autoBrands=input.autoBrands;
  if(Array.isArray(input.ignoredAutoBrands))base.ignoredAutoBrands=arr(input.ignoredAutoBrands,base.ignoredAutoBrands);
  const c=section(input,"context"),a=section(input,"allow"),w=section(input,"warn"),b=section(input,"block"),rp=section(input,"readProtection"),ti=section(input,"testIntegrity"),te=section(input,"testEvidence"),cs=section(input,"changeSurface"),arch=section(input,"architecture"),dt=section(input,"dependencyTruth");
  if(typeof c.enabled==="boolean")base.context.enabled=c.enabled;
  if(typeof c.includeOnSubsessions==="boolean")base.context.includeOnSubsessions=c.includeOnSubsessions;
  if(typeof c.maxCharacters==="number"&&c.maxCharacters>=500)base.context.maxCharacters=Math.floor(c.maxCharacters);
  if("identifiers" in a)base.allow.identifiers=arr(a.identifiers,base.allow.identifiers);
  if("patterns" in a)base.allow.patterns=arr(a.patterns,base.allow.patterns);
  if("paths" in a)base.allow.paths=arr(a.paths,base.allow.paths);
  if("suffixes" in a)base.allow.suffixes=arr(a.suffixes,base.allow.suffixes);
  if("patterns" in w)base.warn.patterns=arr(w.patterns,base.warn.patterns);
  if("ambiguousSuffixes" in w)base.warn.ambiguousSuffixes=arr(w.ambiguousSuffixes,base.warn.ambiguousSuffixes);
  if("patterns" in b)base.block.patterns=arr(b.patterns,base.block.patterns);
  for(const k of ["codeFileExtensions","ignoreExtensions","protectedPaths","commandGuards"] as const)if(k in input)(base[k] as string[]) = arr(input[k],base[k] as string[]);
  if(isRecord(input.qualifierSuggestions))for(const [k,v] of Object.entries(input.qualifierSuggestions))base.qualifierSuggestions[k]=arr(v,[]);
  if(typeof rp.enabled==="boolean")base.readProtection.enabled=rp.enabled;
  if("paths" in rp)base.readProtection.paths=arr(rp.paths,base.readProtection.paths);
  if("allowPaths" in rp)base.readProtection.allowPaths=arr(rp.allowPaths,base.readProtection.allowPaths);
  if(typeof ti.enabled==="boolean")base.testIntegrity.enabled=ti.enabled;
  if(ti.severity==="warn"||ti.severity==="block")base.testIntegrity.severity=ti.severity;
  if("paths" in ti)base.testIntegrity.paths=arr(ti.paths,base.testIntegrity.paths);
  if(typeof te.enabled==="boolean")base.testEvidence.enabled=te.enabled;
  if(te.severity==="warn"||te.severity==="block")base.testEvidence.severity=te.severity;
  if("paths" in te)base.testEvidence.paths=arr(te.paths,base.testEvidence.paths);
  if(typeof cs.enabled==="boolean")base.changeSurface.enabled=cs.enabled;
  if(typeof cs.warnAt==="number"&&cs.warnAt>=1)base.changeSurface.warnAt=Math.floor(cs.warnAt);
  if(typeof cs.blockAt==="number"&&cs.blockAt>=1)base.changeSurface.blockAt=Math.floor(cs.blockAt);
  base.changeSurface.blockAt=Math.max(base.changeSurface.warnAt,base.changeSurface.blockAt);
  if(typeof arch.enabled==="boolean")base.architecture.enabled=arch.enabled;
  if(Array.isArray(arch.rules))base.architecture.rules=arch.rules.filter((x):x is {from:string;denyImports:string[]}=>isRecord(x)&&typeof x.from==="string"&&Array.isArray(x.denyImports)&&x.denyImports.every((v)=>typeof v==="string"));
  if(typeof dt.enabled==="boolean")base.dependencyTruth.enabled=dt.enabled;
  if(dt.severity==="warn"||dt.severity==="block")base.dependencyTruth.severity=dt.severity;
  return base;
}

export async function loadConfig(directory:string,fileName="discipline.config.json"):Promise<NamingDisciplineConfig>{
  const global=await readConfigFile(join(homedir(),".config","opencode",fileName));
  const project=await readConfigFile(join(directory,fileName));
  const config=mergeConfig(deepMerge(global??{},project??{}));
  if(config.autoBrands)config.brands=[...new Set([...config.brands,...await detectBrands(directory,config.ignoredAutoBrands)])];
  return config;
}
async function readConfigFile(path:string):Promise<unknown|undefined>{try{return JSON.parse(await readFile(path,"utf8"));}catch(error){if((error as NodeJS.ErrnoException)?.code!=="ENOENT")console.warn("[open-disipline] Ignoring invalid config:",path);return undefined;}}
function pascalCase(s:string){return s.split(/[^A-Za-z0-9]+/).filter(Boolean).map(x=>x[0]!.toUpperCase()+x.slice(1)).join("");}
function normalized(s:string){return s.toLowerCase().replace(/[^a-z0-9]+/g,"");}
export async function detectBrands(directory:string,ignored=DEFAULT_CONFIG.ignoredAutoBrands):Promise<string[]>{const pkg=await readConfigFile(join(directory,"package.json")) as {name?:unknown}|undefined;const raw=typeof pkg?.name==="string"&&pkg.name.trim()?pkg.name:basename(directory);const candidate=pascalCase(raw);return candidate&&!ignored.some(x=>normalized(x)===normalized(candidate))?[candidate]:[];}
