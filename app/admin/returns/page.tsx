"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import AdminSidebar from "@/components/AdminSidebar";
type R={id:string;orderNumber:string;customerName:string;customerPhone:string;reason:string;details?:string;status:string;total:number;adminNote?:string;refundReference?:string;refundMethod?:string;createdAt?:string};
const money=(n:number)=>"৳"+Number(n||0).toLocaleString("en-BD",{maximumFractionDigits:2});
const pretty=(s:string)=>s.replaceAll("_"," ").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
export default function Returns(){
 const [rows,setRows]=useState<R[]>([]),[err,setErr]=useState(""),[notice,setNotice]=useState(""),[query,setQuery]=useState(""),[filter,setFilter]=useState("ALL"),[loading,setLoading]=useState(true),[busyId,setBusyId]=useState("");
 const load=useCallback(async()=>{setLoading(true);try{const r=await fetch("/api/admin/returns",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load return requests");setRows(Array.isArray(d)?d:[]);setErr("")}catch(e){setErr(e instanceof Error?e.message:"Request failed")}finally{setLoading(false)}},[]);
 useEffect(()=>{void load()},[load]);
 const filtered=useMemo(()=>rows.filter(r=>(filter==="ALL"||r.status===filter)&&[r.orderNumber,r.customerName,r.customerPhone,r.reason,r.details,r.status,r.refundReference].some(v=>String(v||"").toLowerCase().includes(query.trim().toLowerCase()))),[rows,filter,query]);
 async function act(row:R,status:string){
   let refundReference:string|undefined;
   if(status==="REFUNDED"){
     refundReference=window.prompt("Enter the actual refund transaction/reference ID. Do not enter a planned or unprocessed reference.","")?.trim();
     if(!refundReference)return;
     if(refundReference.length<2||refundReference.length>100){setErr("Refund reference must be 2–100 characters.");return}
   }
   const note=window.prompt("Add an optional admin note","");if(note===null)return;
   setBusyId(row.id);setErr("");setNotice("");
   try{
     const res=await fetch("/api/admin/returns/"+encodeURIComponent(row.id),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,adminNote:note.trim()||undefined,refundReference})});
     const d=await res.json().catch(()=>({}));if(!res.ok)throw new Error(d.error||"Could not update return request");
     setNotice(status==="REFUNDED"?"Return updated and refund record saved.":"Return request updated.");await load()
   }catch(e){setErr(e instanceof Error?e.message:"Request failed")}finally{setBusyId("")}
 }
 return <div className="admin-layout"><AdminSidebar/><main className="admin-content">
  <div className="admin-kicker">MART · AFTER-SALES</div><div className="admin-heading-row"><div><h1>Returns & refunds</h1><p>Review requests, confirm returned items and record verified refund references.</p></div><Link className="admin-primary-action" href="/admin/orders">Manage orders →</Link></div>
  <div className="admin-stat-grid"><article className="admin-stat"><span>Total requests</span><strong>{rows.length.toLocaleString("en-BD")}</strong><small>All return records</small></article><article className="admin-stat"><span>Awaiting review</span><strong>{rows.filter(r=>r.status==="REQUESTED").length.toLocaleString("en-BD")}</strong><small>Need a decision</small></article><article className="admin-stat"><span>Return approved</span><strong>{rows.filter(r=>r.status==="APPROVED").length.toLocaleString("en-BD")}</strong><small>Waiting for returned item</small></article><article className="admin-stat"><span>Refunded</span><strong>{rows.filter(r=>r.status==="REFUNDED").length.toLocaleString("en-BD")}</strong><small>Refund reference recorded</small></article></div>
  <div className="admin-alert"><div><span className="admin-alert-eyebrow">REFUND CONTROL</span><h2>Refunds need a real reference</h2><p>Approve a request, confirm the returned item is received, then record the completed payment refund. Paid gateway orders are updated atomically; COD refunds require a recorded manual reference.</p></div><Link href="/admin/payment-transactions">View transactions →</Link></div>
  {err&&<div className="admin-inline-error" role="alert">{err}<button type="button" onClick={()=>void load()}>Retry</button></div>}{notice&&<p className="admin-notice" role="status">{notice}</p>}
  <section className="admin-recent"><div className="admin-section-heading"><div><h2>Return request queue</h2><p>Search by order, customer, reason or refund reference.</p></div><button type="button" onClick={()=>void load()} disabled={loading}>↻ Refresh</button></div><div className="admin-toolbar"><input aria-label="Search return requests" placeholder="Search order, customer, phone or reference…" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Filter return status" value={filter} onChange={e=>setFilter(e.target.value)}><option value="ALL">All statuses</option>{Array.from(new Set(rows.map(r=>r.status))).sort().map(s=><option key={s} value={s}>{pretty(s)}</option>)}</select></div>
  <div className="admin-review-list">{filtered.map(r=><article className="admin-review-card" key={r.id}><div className="admin-review-main"><div className="admin-review-top"><div><h3>{r.orderNumber||"Order"}</h3><p>{r.customerName||"Customer"} · {r.customerPhone||"No phone"}{r.createdAt?" · "+new Date(r.createdAt).toLocaleDateString("en-BD"):""}</p></div><span className="admin-status">{pretty(r.status)}</span></div><p><strong>Amount:</strong> {money(r.total)} &nbsp; <strong>Reason:</strong> {r.reason}</p>{r.details&&<p className="admin-review-comment">{r.details}</p>}{r.adminNote&&<p><strong>Admin note:</strong> {r.adminNote}</p>}{r.refundReference&&<p><strong>Refund reference:</strong> <code>{r.refundReference}</code>{r.refundMethod==="MANUAL_COD"?" · Manual/COD":""}</p>}</div><div className="admin-row-actions">{r.status==="REQUESTED"&&<><button type="button" disabled={busyId===r.id} onClick={()=>void act(r,"APPROVED")}>Approve</button><button type="button" disabled={busyId===r.id} onClick={()=>void act(r,"REJECTED")}>Reject</button></>}{r.status==="APPROVED"&&<><button type="button" disabled={busyId===r.id} onClick={()=>void act(r,"RECEIVED")}>Item received</button><button type="button" disabled={busyId===r.id} onClick={()=>void act(r,"REJECTED")}>Reject</button></>}{r.status==="RECEIVED"&&<button type="button" disabled={busyId===r.id} onClick={()=>void act(r,"REFUNDED")}>Record completed refund</button>}{busyId===r.id&&<span>Saving…</span>}</div></article>)}{loading&&<p className="admin-empty">Loading return requests…</p>}{!loading&&!filtered.length&&<p className="admin-empty">No return requests match these filters.</p>}</div></section>
 </main></div>;
}
