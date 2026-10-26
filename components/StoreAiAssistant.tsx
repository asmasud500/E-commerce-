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
  const [historyOpen,setHistoryOpen]=useState(false);
  const [conversationId,setConversationId]=useState("");
  useEffect(()=>{try{let id=localStorage.getItem("mart-assistant-conversation-id");if(!id){id=crypto.randomUUID().replace(/-/g,"");localStorage.setItem("mart-assistant-conversation-id",id);}setConversationId(id);const saved=localStorage.getItem("mart-assistant-history-v1");if(saved){const parsed=JSON.parse(saved);if(Array.isArray(parsed)&&parsed.length)setMessages(parsed.slice(-60));}}catch{/* Ignore unavailable local storage. */}},[]);
  useEffect(()=>{try{localStorage.setItem("mart-assistant-history-v1",JSON.stringify(messages.slice(-60)));}catch{/* Storage may be unavailable. */}if(conversationId&&messages.some(m=>m.role==="user")){fetch("/api/ai/conversations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({conversationId,messages:messages.slice(-20).map(m=>({role:m.role,text:m.text.slice(0,2000)}))})}).catch(()=>{});}},[messages,conversationId]);
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
  return <div className="store-ai-assistant" style={{position:"fixed",right:"max(14px, env(safe-area-inset-right))",bottom:"calc(88px + env(safe-area-inset-bottom))",zIndex:80}}>
    {open&&<section className="store-ai-panel" aria-label="AI shopping assistant" style={{position:"absolute",right:0,bottom:"76px",width:"min(390px, calc(100vw - 24px))",maxHeight:"min(680px, calc(100dvh - 190px))",display:"flex",flexDirection:"column",overflow:"hidden",borderRadius:22,boxShadow:"0 24px 80px rgba(15,23,42,.28)",border:"1px solid rgba(148,163,184,.28)",background:"#fff"}}>
      <header className="store-ai-panel-head"><div><span className="store-ai-spark">✦</span><div><strong>MART Assistant</strong><small>Product help · Shopping ideas</small></div></div><button type="button" onClick={()=>setOpen(false)} aria-label="Close assistant">×</button></header>
      <div className="store-ai-mode" style={{flexShrink:0}}><button type="button" onClick={()=>setHistoryOpen(v=>!v)} aria-expanded={historyOpen}>{historyOpen?"Back to chat":"Chat history"}</button><button type="button" className={mode==="shopping-assistant"?"active":""} onClick={()=>setMode("shopping-assistant")}>Find products</button><button type="button" className={mode==="customer-support"?"active":""} onClick={()=>setMode("customer-support")}>Product help</button></div>
      {historyOpen&&<div className="store-ai-history" style={{padding:"12px 16px",overflowY:"auto",borderBottom:"1px solid #e5e7eb",background:"#f8fafc"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><strong>Recent conversation</strong><button type="button" onClick={()=>{setMessages([{role:"assistant",text:"Hi! I can help you find products or answer general product questions. I can’t verify payments or order-specific status here."}]);setHistoryOpen(false)}}>Clear history</button></div><p style={{fontSize:12,margin:"4px 0 8px"}}>Saved on this device only.</p>{messages.slice(-20).map((m,i)=><div key={i} style={{padding:"8px 10px",margin:"6px 0",borderRadius:10,background:m.role==="user"?"#fff0e6":"#fff",border:"1px solid #e5e7eb"}}><small style={{fontWeight:700}}>{m.role==="user"?"You":"MART Assistant"}</small><div style={{fontSize:13,overflowWrap:"anywhere"}}>{m.text}</div></div>)}</div>}<div className="store-ai-messages" aria-live="polite" style={{flex:"1 1 auto",minHeight:100,overflowY:"auto",overscrollBehavior:"contain"}}>{messages.map((m,i)=><div key={i} className={"store-ai-message "+m.role}><div>{m.text}</div>{m.products && m.products.length>0&&<div className="store-ai-products">{m.products.map((p:any)=><Link key={p.id} href={p.slug?"/products/"+encodeURIComponent(p.slug):"/products"} onClick={()=>setOpen(false)}><span>{p.name}</span><b>৳{Number(p.price||0).toLocaleString("en-BD")}</b><small>{p.category||"Product"}</small></Link>)}</div>}{m.links && m.links.length>0&&<div className="store-ai-products">{m.links.map(link=><Link key={link.href} href={link.href} onClick={()=>setOpen(false)}><span>{link.label}</span><b>→</b></Link>)}</div>}</div>)}{busy&&<div className="store-ai-message assistant"><div className="store-ai-typing">Looking that up…</div></div>}<div ref={bottom}/></div>
      {error&&<p className="store-ai-error" role="status">{error}</p>}
      <form className="store-ai-compose" onSubmit={send} style={{flexShrink:0}}><textarea value={value} onChange={e=>setValue(e.target.value)} placeholder={mode==="shopping-assistant"?"What product are you looking for?":"Ask a product question…"} rows={2} maxLength={2000} aria-label="Message the assistant"/><button type="submit" disabled={busy||!value.trim()} aria-label="Send message">↑</button></form>
      <p className="store-ai-privacy">Messages may be processed by Google Gemini. Don't share personal details, OTPs, passwords, or payment secrets. Check order/payment status through official account support.</p>
    </section>}
    <button type="button" className="store-ai-launcher" style={{boxShadow:"0 10px 32px rgba(255,104,1,.32)",minHeight:58,borderRadius:999,display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"0 22px",whiteSpace:"nowrap"}} onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-label={open?"Close MART Assistant":"Open MART Assistant"}><span aria-hidden="true">{open?"×":"✦"}</span>{!open&&<b>Ask MART</b>}</button>
  </div>;
}
