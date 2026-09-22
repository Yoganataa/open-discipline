import { normalizePath } from "../scanners/paths.ts";

export interface TaskIntent {
  sessionID:string;
  messageID:string;
  text:string;
  declaredPaths:string[];
}

const PATH_EXTENSIONS=new Set([
  ".ts",".tsx",".js",".jsx",".mjs",".cjs",".py",".pyi",".kt",".kts",".java",".go",".rs",
  ".cs",".fs",".fsx",".dart",".swift",".c",".h",".cc",".cpp",".cxx",".hpp",".xml",
  ".json",".jsonc",".yaml",".yml",".toml",".ini",".properties",".gradle",".csproj",
  ".vbproj",".md",".mdx",".txt",".lock"
]);

function cleanCandidate(value:string):string {
  return value
    .trim()
    .replace(/^[\x60"'([{<]+/,"")
    .replace(/[\x60"'\\)]},;:]+$/,"")
    .replace(/[。！？]+$/u,"")
    .trim();
}

function looksLikePath(value:string):boolean {
  if(!value||value.includes("://")||/^[A-Za-z]:[\\/]/.test(value))return false;
  const normalized=normalizePath(value);
  if(normalized.includes("/")||normalized.includes("*")||normalized.includes("?"))return true;
  if(normalized.startsWith("."))return true;
  const lower=normalized.toLowerCase();
  return [...PATH_EXTENSIONS].some(ext=>lower.endsWith(ext));
}

function normalizeDeclaredPath(value:string):string|undefined {
  let candidate=cleanCandidate(value);
  if(!looksLikePath(candidate))return;
  candidate=normalizePath(candidate).replace(/^\/+/,"");
  if(!candidate)return;
  return candidate;
}

export function extractDeclaredPaths(text:string):string[] {
  const found=new Set<string>();
  const add=(value:string)=>{
    const normalized=normalizeDeclaredPath(value);
    if(normalized)found.add(normalized);
  };

  for(const match of text.matchAll(/[\x60]([^\x60]+)[\x60]/g))add(match[1]??"");
  for(const raw of text.split(/\s+/)){
    const candidate=cleanCandidate(raw);
    if(!candidate)continue;
    add(candidate);
  }
  return [...found];
}

function messageText(message:{parts?:unknown[]}):string {
  const parts=Array.isArray(message.parts)?message.parts:[];
  return parts.flatMap(part=>{
    if(!part||typeof part!=="object")return [];
    const value=part as Record<string,unknown>;
    if(value.type!=="text"||typeof value.text!=="string"||value.synthetic===true)return [];
    return [value.text];
  }).join("\n").trim();
}

export function captureLatestUserIntent(output:{messages:unknown[]}):TaskIntent|undefined {
  if(!Array.isArray(output.messages))return;
  for(let i=output.messages.length-1;i>=0;i--){
    const candidate=output.messages[i];
    if(!candidate||typeof candidate!=="object")continue;
    const record=candidate as Record<string,unknown>;
    const info=record.info;
    if(!info||typeof info!=="object")continue;
    const metadata=info as Record<string,unknown>;
    if(metadata.role!=="user"||typeof metadata.sessionID!=="string"||typeof metadata.id!=="string")continue;
    const text=messageText(record);
    if(!text)continue;
    return { sessionID:metadata.sessionID, messageID:metadata.id, text, declaredPaths:extractDeclaredPaths(text) };
  }
  return;
}
