"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Match = { id:string; name:string; slug?:string|null; price?:number; category?:string|null; stock?:number; images?:string[] };
export default function SmartSearchSuggestions({ query }: { query: string }) {
  const [state,setState] = useState<{loading:boolean;text:string;products:Match[]}>({loading:true,text:"",products:[]});
  useEffect(()=>{
    let cancelled=false;
    if(!query.trim()){setState({loading:false,text:"",products:[]});return;}
    fetch("/api/ai/smart-search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input:query})})
      .then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error?.message||"AI search suggestions are unavailable.");return j;})
      .then(j=>{if(!cancelled)setState({loading:false,text:String(j.text||""),products:Array.isArray(j.products)?j.products:[]});})
      .catch(()=>{if(!cancelled)setState({loading:false,text:"AI suggestions are temporarily unavailable. Standard search results are shown below.",products:[]});});
    return()=>{cancelled=true};
  },[query]);
  if(!query.trim())return null;
  return <section className="ai-search-suggestions" aria-label="AI search suggestions">
    <div className="ai-search-head"><span aria-hidden="true">✦</span><div><strong>Smart search</strong><small>{state.loading?"Finding relevant products…":state.text}</small></div></div>
    {!state.loading&&state.products.length>0&&<div className="ai-search-results">{state.products.slice(0,5).map(p=><Link href={p.slug?"/products/"+encodeURIComponent(p.slug):"/products"} key={p.id} className="ai-search-product"><span>{p.name}</span><b>৳{Number(p.price||0).toLocaleString("en-BD")}</b><small>{p.category||"Product"}{p.stock!=null?" · "+p.stock+" in stock":""}</small></Link>)}</div>}
  </section>;
}
