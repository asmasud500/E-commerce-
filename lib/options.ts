export type ProductOption={name:string;values:string[]};

/** "Size: S, M, L" per line → options. Blank lines and options without values are ignored. */
export function parseOptionsText(text:string):ProductOption[]{
  const out:ProductOption[]=[];
  for(const line of String(text||"").split(/\r?\n/)){
    const i=line.indexOf(":");if(i<1)continue;
    const name=line.slice(0,i).trim().slice(0,40);
    const values=[...new Set(line.slice(i+1).split(",").map(v=>v.trim().slice(0,40)).filter(Boolean))].slice(0,30);
    if(name&&values.length&&!out.some(o=>o.name.toLowerCase()===name.toLowerCase()))out.push({name,values});
    if(out.length>=5)break;
  }
  return out;
}
export const optionsToText=(o:unknown)=>Array.isArray(o)?(o as ProductOption[]).map(x=>x.name+": "+x.values.join(", ")).join("\n"):"";

/** Checks a customer's selection against the product's options. Returns the label ("Size: M, Color: Red") or an error. */
export function resolveSelection(options:unknown,selection:Record<string,string>|undefined):{ok:true;label:string}|{ok:false;error:string}{
  const opts=Array.isArray(options)?(options as ProductOption[]):[];
  if(!opts.length)return {ok:true,label:""};
  const parts:string[]=[];
  for(const o of opts){
    const v=selection?.[o.name];
    if(!v||!o.values.includes(v))return {ok:false,error:"Please choose "+o.name+"."};
    parts.push(o.name+": "+v);
  }
  return {ok:true,label:parts.join(", ")};
}
