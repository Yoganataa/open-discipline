export function normalizePath(filePath: string): string { return filePath.replace(/\\/g, "/").replace(/^\.\//, ""); }
export function getExtension(filePath: string): string { const p=normalizePath(filePath), s=p.lastIndexOf("/"), d=p.lastIndexOf("."); return d<=s?"":p.slice(d).toLowerCase(); }
export function basenameToIdentifier(filePath: string): string {
  const p=normalizePath(filePath); const s=p.lastIndexOf("/"); let b=s>=0?p.slice(s+1):p; const d=b.lastIndexOf("."); if(d>0)b=b.slice(0,d); if(!b)return"";
  if(!/[-_ .]/.test(b)) return b.charAt(0).toUpperCase()+b.slice(1);
  return b.split(/[-_ .]+/).filter(Boolean).map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join("");
}
function globToRegExp(pattern:string):RegExp{
  let source="^"; for(let i=0;i<pattern.length;i++){const c=pattern[i]??""; if(c==="*"&&pattern[i+1]==="*"){source+=".*";i++;continue;} if(c==="*"){source+="[^/]*";continue;} if(c==="?"){source+="[^/]";continue;} source+=c.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");} return new RegExp(source+"$");
}
export function matchesPath(filePath:string,patterns:string[]):boolean{ const p=normalizePath(filePath); return patterns.some(raw=>{const x=normalizePath(raw).replace(/^\/+/,""); if(!x)return false; return x.includes("*")||x.includes("?")?globToRegExp(x).test(p):p===x||p.startsWith(`${x.replace(/\/$/,"")}/`)||p.includes(`/${x}`);}); }
