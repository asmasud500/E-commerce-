"use client";

import {useCallback,useEffect,useState,type FormEvent} from "react";
import AdminSidebar from "@/components/AdminSidebar";

type Kind="delivery-zones"|"banners"|"flash-sales";
type Row=Record<string,any>&{id:string};

export default function AdminResourceManager({kind}:{kind:Kind}){
 const meta:Record<Kind,{title:string;description:string;endpoint:string}>={
  "delivery-zones":{title:"Delivery Zones",description:"Configure district-level delivery fees and estimated delivery days.",endpoint:"/api/admin/delivery-zones"},
  banners:{title:"Store Banners",description:"Create promotional banners and control their storefront visibility.",endpoint:"/api/admin/banners"},
  "flash-sales":{title:"Flash Sales",description:"Schedule product discounts with start/end times and explicit product IDs.",endpoint:"/api/admin/flash-sales"}
 };
 const m=meta[kind];
 const [rows,setRows]=useState<Row[]>([]);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [form,setForm]=useState<Record<string,string>>({});
 const load=useCallback(async()=>{try{const r=await fetch(m.endpoint,{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not load records");setRows(Array.isArray(j)?j:[]);}catch(e){setNotice(e instanceof Error?e.message:"Request failed");}},[m.endpoint]);
 useEffect(()=>{void load();},[load]);
 const fields=kind==="delivery-zones"
  ?[{key:"name",label:"Zone name",type:"text",required:true},{key:"district",label:"District",type:"text",required:true},{key:"fee",label:"Delivery fee (৳)",type:"number",required:true},{key:"estimatedDays",label:"Estimated days",type:"number",required:true}]
  :kind==="banners"
  ?[{key:"title",label:"Banner title",type:"text",required:true},{key:"imageUrl",label:"Image URL (https)",type:"url",required:true},{key:"href",label:"Destination URL",type:"text",required:false},{key:"sortOrder",label:"Sort order",type:"number",required:true}]
  :[{key:"title",label:"Flash sale title",type:"text",required:true},{key:"productIds",label:"Product IDs (comma separated)",type:"text",required:true},{key:"discountPercent",label:"Discount percent (1–90)",type:"number",required:true},{key:"startsAt",label:"Start time",type:"datetime-local",required:true},{key:"endsAt",label:"End time",type:"datetime-local",required:true}];
 const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setNotice("");try{
  const body:Record<string,any>={...form};
  if(kind==="delivery-zones"){body.fee=Number(body.fee);body.estimatedDays=Number(body.estimatedDays);body.active=true;}
  if(kind==="banners"){body.sortOrder=Number(body.sortOrder||0);body.active=false;}
  if(kind==="flash-sales"){body.productIds=String(body.productIds).split(",").map(x=>x.trim()).filter(Boolean);body.discountPercent=Number(body.discountPercent);body.startsAt=new Date(body.startsAt).toISOString();body.endsAt=new Date(body.endsAt).toISOString();body.active=false;}
  const r=await fetch(m.endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not save record");setForm({});setNotice("Saved successfully.");await load();
 }catch(e){setNotice(e instanceof Error?e.message:"Request failed");}finally{setBusy(false);}};
 const patch=async(row:Row,data:Record<string,any>)=>{setNotice("");try{const r=await fetch(m.endpoint+"/"+encodeURIComponent(row.id),{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw new Error(j.error||"Update failed");setNotice("Updated.");await load();}catch(e){setNotice(e instanceof Error?e.message:"Update failed");}};
 const remove=async(row:Row)=>{if(!window.confirm("Delete this record?"))return;try{const r=await fetch(m.endpoint+"/"+encodeURIComponent(row.id),{method:"DELETE"});const j=await r.json();if(!r.ok)throw new Error(j.error||"Delete failed");setNotice("Deleted.");await load();}catch(e){setNotice(e instanceof Error?e.message:"Delete failed");}};
 const label=(row:Row)=>String(row.title||row.name||"Untitled");
 return <div className="admin-layout"><AdminSidebar/><main className="admin-content"><div className="admin-kicker">MART · STORE CONTROL</div><div className="admin-heading-row"><div><h1>{m.title}</h1><p>{m.description}</p></div></div>
  {notice&&<p role="status" className="admin-notice">{notice}</p>}
  <section className="admin-recent"><h2>Create new</h2><form className="admin-resource-form" onSubmit={submit}>{fields.map(f=><label key={f.key}>{f.label}<input required={f.required} type={f.type} min={f.type==="number"?"0":undefined} value={form[f.key]||""} onChange={e=>setForm(old=>({...old,[f.key]:e.target.value}))}/></label>)}<button disabled={busy} type="submit">{busy?"Saving…":"Save"}</button></form>{kind==="flash-sales"&&<p className="admin-footnote">Product IDs must match existing product document IDs. Sales are stored here; storefront pricing/automatic activation is a separate integration step.</p>}</section>
  <section className="admin-recent"><div className="admin-section-heading"><div><h2>Saved records</h2><p>{rows.length} record(s)</p></div><button type="button" onClick={()=>void load()}>Refresh</button></div>{rows.length===0?<p className="admin-empty">No records yet.</p>:<div className="admin-table-wrap"><table><thead><tr><th>Name</th><th>Status</th><th>Details</th><th>Actions</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{label(row)}</td><td><span className="admin-status">{row.active?"Active":"Inactive"}</span></td><td>{kind==="delivery-zones"?row.district+" · ৳"+row.fee+" · "+row.estimatedDays+" day(s)":kind==="banners"?(row.imageUrl||"No image URL"):(row.discountPercent+"% · "+(row.productIds||[]).length+" product(s)")}</td><td><div className="admin-row-actions"><button type="button" onClick={()=>void patch(row,{active:!row.active})}>{row.active?"Disable":"Enable"}</button><button type="button" onClick={()=>void remove(row)}>Delete</button></div></td></tr>)}</tbody></table></div>}</section>
 </main></div>;
}
