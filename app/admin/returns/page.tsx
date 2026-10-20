"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import AdminSidebar from "@/components/AdminSidebar";
type R={id:string;orderNumber:string;customerName:string;customerPhone:string;reason:string;details?:string;status:string;total:number;adminNote?:string};
export default function Returns(){
  const [rows,setRows]=useState<R[]>([]),[err,setErr]=useState("");
  const load=()=>fetch("/api/admin/returns").then(r=>r.json()).then(d=>setRows(Array.isArray(d)?d:[])).catch(()=>setErr("Could not load"));
  useEffect(()=>{load()},[]);
  async function act(r:R,status:string){
    const note=window.prompt("Note (optional)","")||"";
    const res=await fetch("/api/admin/returns/"+r.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,adminNote:note||undefined})});
    const d=await res.json().catch(()=>({}));if(!res.ok)setErr(d.error||"Failed");else{setErr("");load()}
  }
  return <div className="admin-layout"><AdminSidebar/><main className="admin-content"><Link href="/admin">← Dashboard</Link><h1>Return requests</h1><p>Approve or reject customer returns. Refund the money from the order's refund action, then mark it Refunded.</p>{err&&<p role="alert" style={{color:"#b91c1c"}}>{err}</p>}
    <section className="admin-card" style={{display:"grid",gap:12}}>{rows.length===0&&<p>No return requests.</p>}
      {rows.map(r=><article key={r.id} style={{border:"1px solid #e5e7eb",borderRadius:10,padding:12}}>
        <b>{r.orderNumber}</b> · {r.customerName} · {r.customerPhone} · ৳{Number(r.total).toLocaleString("en-BD")} · <b>{r.status}</b><br/>Reason: {r.reason}{r.details?" — "+r.details:""}{r.adminNote?<><br/><small>Note: {r.adminNote}</small></>:null}<br/>
        {r.status==="REQUESTED"&&<><button onClick={()=>act(r,"APPROVED")}>Approve</button> <button onClick={()=>act(r,"REJECTED")}>Reject</button></>}
        {r.status==="APPROVED"&&<><button onClick={()=>act(r,"REFUNDED")}>Mark refunded</button> <button onClick={()=>act(r,"REJECTED")}>Reject</button></>}
      </article>)}
    </section></main></div>;
}
