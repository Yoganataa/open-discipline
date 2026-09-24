export interface Change {
  filePath:string;
  addedText:string;
  removedText?:string;
  deleted?:boolean;
  source:"write"|"edit"|"apply_patch";
}
interface PatchFile { filePath:string; operation:"add"|"update"|"delete"; movePath?:string; addedLines:string[]; removedLines:string[]; }
export function extractChanges(toolName:string,args:Record<string,unknown>):Change[]{
  if(toolName==="write"){
    const f=typeof args.filePath==="string"?args.filePath:undefined,c=typeof args.content==="string"?args.content:undefined;
    return f&&c!==undefined?[{filePath:f,addedText:c,source:"write"}]:[];
  }
  if(toolName==="edit"){
    const f=typeof args.filePath==="string"?args.filePath:undefined;
    const c=typeof args.newString==="string"?args.newString:typeof args.content==="string"?args.content:undefined;
    const old=typeof args.oldString==="string"?args.oldString:undefined;
    return f&&c!==undefined?[{filePath:f,addedText:c,removedText:old,source:"edit"}]:[];
  }
  if(toolName==="apply_patch"){
    const p=typeof args.patchText==="string"?args.patchText:undefined;
    return p?parseApplyPatch(p):[];
  }
  return[];
}
export function parseApplyPatch(text:string):Change[]{
  const lines=text.replace(/\r\n/g,"\n").split("\n"),files:PatchFile[]=[];let cur:PatchFile|undefined;
  const flush=()=>{if(cur)files.push(cur);cur=undefined;};
  for(const line of lines){
    const m=/^\*\*\* (Add|Update|Delete) File:\s*(.+?)\s*$/.exec(line);
    if(m){flush();cur={filePath:m[2]!,operation:m[1]!.toLowerCase() as PatchFile["operation"],addedLines:[],removedLines:[]};continue;}
    const mv=/^\*\*\* Move to:\s*(.+?)\s*$/.exec(line);if(mv&&cur){cur.movePath=mv[1];continue;}
    if(cur&&line.startsWith("+")&&!line.startsWith("+++"))cur.addedLines.push(line.slice(1));
    if(cur&&line.startsWith("-")&&!line.startsWith("---"))cur.removedLines.push(line.slice(1));
  }
  flush();
  const out:Change[]=[];
  for(const f of files){
    const added=f.addedLines.join("\n"),removed=f.removedLines.join("\n");
    out.push({filePath:f.filePath,addedText:added,removedText:removed,deleted:f.operation==="delete",source:"apply_patch"});
    if(f.movePath)out.push({filePath:f.movePath,addedText:added,removedText:removed,source:"apply_patch"});
  }
  return out;
}
