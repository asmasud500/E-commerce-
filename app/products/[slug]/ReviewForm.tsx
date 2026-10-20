"use client";
import {useState} from "react";
import {fileToCompressedDataUrl} from "@/lib/client-image";
export default function ReviewForm({productId}:{productId:string}){
  const [rating,setRating]=useState(5),[comment,setComment]=useState(""),[file,setFile]=useState<File|null>(null),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setMsg("");
    try{
      const photo=file?await fileToCompressedDataUrl(file,500_000):undefined;
      const r=await fetch("/api/reviews",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId,rating,comment,photo})});
      const d=await r.json().catch(()=>({}));
      setMsg(r.ok?"Thank you! Your review will appear after approval.":r.status===401?"Please log in to write a review.":d.error||"Could not submit your review.");
      if(r.ok){setComment("");setFile(null)}
    }catch{setMsg("Could not submit your review. Please try again.")}
    finally{setBusy(false)}
  }
  return <form onSubmit={submit} className="rv-form">
    <h3>Write a review</h3>
    <label>Rating <select value={rating} onChange={e=>setRating(Number(e.target.value))}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{"★".repeat(n)}{"☆".repeat(5-n)}</option>)}</select></label>
    <textarea rows={3} maxLength={1000} placeholder="Share your experience" value={comment} onChange={e=>setComment(e.target.value)}/>
    <label>Photo (optional) <input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
    <button className="pg-btn" disabled={busy} type="submit">{busy?"Sending…":"Submit review"}</button>
    {msg&&<small role="status">{msg}</small>}
    <small>Only customers who bought this product can review it.</small>
  </form>;
}
