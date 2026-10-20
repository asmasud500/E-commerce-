"use client";
import {useState} from "react";

export default function InvoiceDownloadButton({orderId,className="pg-btn pg-btn-line",label="Download invoice"}:{orderId?:string;className?:string;label?:string}){
 const[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function download(){
  if(busy)return;
  setBusy(true);setError("");
  try{
   const id=orderId||(typeof window!=="undefined"?sessionStorage.getItem("lastOrderId"):"");
   if(!id)throw new Error("Order details are unavailable. Open My Orders and try again.");
   const token=typeof window!=="undefined"?sessionStorage.getItem("orderPaymentToken")||"":"";
   const response=await fetch("/api/orders/"+encodeURIComponent(id)+"/invoice"+(token?"?accessToken="+encodeURIComponent(token):""),{cache:"no-store"});
   if(!response.ok){const d=await response.json().catch(()=>({}));throw new Error(d.error||"Could not download invoice.");}
   const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement("a");
   a.href=url;a.download="invoice-"+id+".html";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }catch(e){setError(e instanceof Error?e.message:"Could not download invoice.");}
  finally{setBusy(false);}
 }
 return <span style={{display:"inline-flex",flexDirection:"column",alignItems:"flex-start",gap:5}}><button type="button" className={className} disabled={busy} onClick={()=>void download()}>{busy?"Preparing invoice…":label}</button>{error&&<small role="alert" style={{color:"#b42318",maxWidth:260}}>{error}</small>}</span>;
}