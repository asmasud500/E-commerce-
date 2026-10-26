"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import StoreHeader from "@/components/StoreHeader";
import StoreFooter from "@/components/StoreFooter";
import {Icon} from "@/components/Icons";

type StoredOrder={orderNumber:string;contact:string};
export default function ReturnPage(){
 const [order,setOrder]=useState<StoredOrder|null>(null);
 const [reason,setReason]=useState("Wrong or damaged item");
 const [details,setDetails]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [submitted,setSubmitted]=useState(false);
 useEffect(()=>{try{const raw=sessionStorage.getItem("mart_return_order");if(raw){const v=JSON.parse(raw);if(v?.orderNumber&&v?.contact)setOrder({orderNumber:String(v.orderNumber),contact:String(v.contact)})}}catch{}},[]);
 async function submit(e:React.FormEvent){
  e.preventDefault();if(!order||busy)return;setBusy(true);setMessage("");
  try{const r=await fetch("/api/orders/return",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...order,reason,details})});const d=await r.json().catch(()=>({}));if(!r.ok)setMessage(d.error||"Could not submit your return request.");else{setSubmitted(true);setMessage("Your return request has been submitted. We will contact you with the next steps.")}}
  catch{setMessage("Unable to connect. Please try again.")}finally{setBusy(false)}
 }
 return <><StoreHeader/><main id="main-content" className="pg"><nav className="pg-crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevronRight" size={14}/><Link href="/track">Order tracking</Link><Icon name="chevronRight" size={14}/><b>Return request</b></nav><section className="pg-card" style={{maxWidth:720,margin:"0 auto",padding:24}}><h1>Return an order</h1><p>Choose the reason that best describes your return. Your order number and contact details have been carried over from order tracking.</p>{!order?<div><p className="form-error" role="alert">No verified order was carried over. Please track your order first, then choose the return option below its tracking details.</p><Link className="pg-btn" href="/track">Go to order tracking</Link></div>:<><div style={{padding:14,border:"1px solid var(--border, #e5e7eb)",borderRadius:12,margin:"16px 0"}}><small>Order number</small><h2 style={{margin:"4px 0"}}>{order.orderNumber}</h2><small>Contact details verified on the tracking page</small></div>{!submitted&&<form onSubmit={submit} style={{display:"grid",gap:14}}><label className="fld"><span>Reason for return</span><select value={reason} onChange={e=>setReason(e.target.value)} required><option>Wrong or damaged item</option><option>Not as described</option><option>Changed my mind</option><option>Missing item or parts</option><option>Other</option></select></label><label className="fld"><span>Additional details (optional)</span><textarea value={details} onChange={e=>setDetails(e.target.value)} rows={4} maxLength={1000} placeholder="Describe the issue and any useful details"/></label><button className="pg-btn pg-btn-block" type="submit" disabled={busy}>{busy?"Submitting…":"Submit return request"} <Icon name="arrowRight" size={18}/></button></form>}{message&&<p role="status" style={{marginTop:14}}>{message}</p>}{submitted&&<Link className="pg-btn" href={"/track?order="+encodeURIComponent(order.orderNumber)}>Back to order tracking</Link>}</>}</section></main><StoreFooter/></>;
}
