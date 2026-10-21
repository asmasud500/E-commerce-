"use client";
import {useState} from "react";

export default function InvoiceDownloadButton({orderId,className="pg-btn pg-btn-line",label="View / Download A4 Invoice"}:{orderId?:string;className?:string;label?:string}){
 const[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function openInvoice(){
  if(busy)return;
  setBusy(true);setError("");
  try{
   const id=orderId||(typeof window!=="undefined"?sessionStorage.getItem("lastOrderId"):"");
   if(!id)throw new Error("Order details are unavailable. Open My Orders and try again.");
   const token=typeof window!=="undefined"?sessionStorage.getItem("orderPaymentToken")||"":"";
   const url="/api/orders/"+encodeURIComponent(id)+"/invoice"+(token?"?accessToken="+encodeURIComponent(token):"");
   // Open synchronously from the click to avoid mobile-browser popup blocking.
   const tab=window.open(url,"_blank");
   if(!tab)throw new Error("Your browser blocked the invoice tab. Allow pop-ups for this site and try again.");
  }catch(e){setError(e instanceof Error?e.message:"Could not open invoice.");}
  finally{setBusy(false);}
 }
 return <span style={{display:"inline-flex",flexDirection:"column",alignItems:"flex-start",gap:5}}><button type="button" className={className} disabled={busy} onClick={()=>void openInvoice()}>{busy?"Opening invoice…":label}</button>{error&&<small role="alert" style={{color:"#b42318",maxWidth:280}}>{error}</small>}</span>;
}
