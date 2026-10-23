"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

type Message={role:"user"|"assistant";text:string;products?:any[];links?:{label:string;href:string}[]};
export default function StoreAiAssistant(){
  const [open,setOpen]=useState(false);
  const [mode,setMode]=useState<"shopping-assistant"|"customer-support">("shopping-assistant");
  const [messages,setMessages]=useState<Message[]>([{role:"assistant",text:"Hi! I can help you find products or answer general product questions. I can't verify payments or order-specific status here."}]);
  const [value,setValue]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const bottom=useRef<HTMLDivElement>(null);
  useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth",block:"end"});},[messages,busy,open]);
  async function send(e:FormEvent){
    e.preventDefault();const text=value.trim();if(!text||busy)return;
    const history=messages.slice(-6).map(m=>({role:m.role,text:m.text.slice(0,1000)}));
    setMessages(prev=>[...prev,{role:"user",text}]);setValue("");setBusy(true);setError("");
    try{
      const r=await fetch("/api/ai/"+mode,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input:text,conversation:history})});
      const j=await r.json();if(!r.ok)throw new Error(j.error?.message||"The assistant is temporarily unavailable.");
      setMessages(prev=>[...prev,{role:"assistant",text:String(j.text||"I couldn't find an answer for that question."),products:Array.isArray(j.products)?j.products.slice(0,4):[],links:Array.isArray(j.links)?j.links.slice(0,3):[]}]);
    }catch(err){setError(err instanceof Error?err.message:"Please try again later.");}
    finally{setBusy(false);}
  }
  return <div className="store-ai-assistant">
    {open&&<section className="store-ai-panel" aria-label="AI shopping assistant">
      <header className="store-ai-panel-head"><div><span className="store-ai-spark">✦</span><div><strong>MART Assistant</strong><small>Product help · Shopping ideas</small></div></div><button type="button" onClick={()=>setOpen(false)} aria-label="Close assistant">×</button></header>
      <div className="store-ai-mode"><button type="button" className={mode==="shopping-assistant"?"active":""} onClick={()=>setMode("shopping-assistant")}>Find products</button><button type="button" className={mode==="customer-support"?"active":""} onClick={()=>setMode("customer-support")}>Product help</button></div>
      <div className="store-ai-messages" aria-live="polite">{messages.map((m,i)=><div key={i} className={"store-ai-message "+m.role}><div>{m.text}</div>{m.products && m.products.length>0&&<div className="store-ai-products">{m.products.map((p:any)=><Link key={p.id} href={p.slug?"/products/"+encodeURIComponent(p.slug):"/products"} onClick={()=>setOpen(false)}><span>{p.name}</span><b>৳{Number(p.price||0).toLocaleString("en-BD")}</b><small>{p.category||"Product"}</small></Link>)}</div>}{m.links && m.links.length>0&&<div className="store-ai-products">{m.links.map(link=><Link key={link.href} href={link.href} onClick={()=>setOpen(false)}><span>{link.label}</span><b>→</b></Link>)}</div>}</div>)}{busy&&<div className="store-ai-message assistant"><div className="store-ai-typing">Looking that up…</div></div>}<div ref={bottom}/></div>
      {error&&<p className="store-ai-error" role="status">{error}</p>}
      <form className="store-ai-compose" onSubmit={send}><textarea value={value} onChange={e=>setValue(e.target.value)} placeholder={mode==="shopping-assistant"?"What product are you looking for?":"Ask a product question…"} rows={2} maxLength={2000} aria-label="Message the assistant"/><button type="submit" disabled={busy||!value.trim()} aria-label="Send message">↑</button></form>
      <p className="store-ai-privacy">Messages may be processed by Google Gemini. Don't share personal details, OTPs, passwords, or payment secrets. Check order/payment status through official account support.</p>
    </section>}
    <button type="button" className="store-ai-launcher" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-label={open?"Close MART Assistant":"Open MART Assistant"}><span aria-hidden="true">{open?"×":"✦"}</span>{!open&&<b>Ask MART</b>}</button>
  </div>;
}
