"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import AdminSidebar from "@/components/AdminSidebar";
import {PROVIDERS} from "@/lib/integrations/providers";

type Info={id:string;name:string;help:string;enabled:boolean;config:Record<string,string>;secretsSet:Record<string,boolean>};

function Card({def,info,onSaved}:{def:typeof PROVIDERS[number];info?:Info;onSaved:()=>void}){
  const [enabled,setEnabled]=useState(!!info?.enabled),[config,setConfig]=useState<Record<string,string>>(info?.config||{}),[secrets,setSecrets]=useState<Record<string,string>>({}),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false),[phone,setPhone]=useState("");
  useEffect(()=>{setEnabled(!!info?.enabled);setConfig(info?.config||{})},[info]);
  async function save(e:React.FormEvent){
    e.preventDefault();setBusy(true);setMsg("");
    try{
      const r=await fetch("/api/admin/integrations/"+def.id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled,config,secrets})});
      const d=await r.json().catch(()=>({}));
      if(r.ok){setSecrets({});setMsg("Saved.");onSaved()}else setMsg(d.error||"Save failed");
    }catch{setMsg("Save failed")}finally{setBusy(false)}
  }
  async function test(){
    setMsg("Sending…");
    const r=await fetch("/api/admin/integrations/sms/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone})});
    const d=await r.json().catch(()=>({}));setMsg(r.ok?"Test SMS sent.":d.error||"Test failed");
  }
  return <section className="admin-card" style={{marginBottom:18}}>
    <h2 style={{margin:0}}>{def.name}</h2><p style={{color:"#6b7280"}}>{def.help}</p>
    <form onSubmit={save} style={{display:"grid",gap:10,maxWidth:560}}>
      <label><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Enabled</label>
      {def.config.map(f=><label key={f.key} style={{display:"grid",gap:4}}>{f.label}<input value={config[f.key]||""} placeholder={f.placeholder} onChange={e=>setConfig({...config,[f.key]:e.target.value})}/></label>)}
      {def.secrets.map(f=><label key={f.key} style={{display:"grid",gap:4}}>{f.label} {info?.secretsSet?.[f.key]?<small style={{color:"#047857"}}>✔ saved — leave blank to keep</small>:<small style={{color:"#b45309"}}>not set</small>}
        <input type="password" autoComplete="new-password" value={secrets[f.key]||""} placeholder={info?.secretsSet?.[f.key]?"••••••••":""} onChange={e=>setSecrets({...secrets,[f.key]:e.target.value})}/></label>)}
      <button disabled={busy}>{busy?"Saving…":"Save"}</button>
      {def.id==="sms"&&<div style={{display:"flex",gap:8}}><input placeholder="Test phone 01XXXXXXXXX" value={phone} onChange={e=>setPhone(e.target.value)}/><button type="button" onClick={test}>Send test SMS</button></div>}
      {msg&&<small role="status">{msg}</small>}
    </form>
  </section>;
}

export default function Integrations(){
  const [list,setList]=useState<Info[]>([]),[err,setErr]=useState("");
  const load=()=>fetch("/api/admin/integrations",{cache:"no-store"}).then(r=>r.json()).then(d=>Array.isArray(d)?setList(d):setErr("Could not load")).catch(()=>setErr("Could not load"));
  useEffect(()=>{load()},[]);
  return <div className="admin-layout"><AdminSidebar/><main className="admin-content"><div className="admin-kicker">MART · CONNECTED SERVICES</div><Link href="/admin">← Dashboard</Link><div className="admin-heading-row"><div><h1>Integrations & API keys</h1>
    <p>Keys are encrypted on the server and can never be shown again — you can only replace them. Courier booking appears on the Orders page once a courier is enabled.</p></div></div>
    {err&&<p role="alert">{err}</p>}
    {PROVIDERS.map(d=><Card key={d.id} def={d} info={list.find(x=>x.id===d.id)} onSaved={load}/>)}
  </main></div>;
}
