"use client";
import {useState} from "react";

export default function TelegramInvoiceStorageButton({orderId}:{orderId:string}){
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  async function store(){
    if(busy)return;
    setBusy(true);setMessage("");
    try{
      const r=await fetch("/api/admin/orders/"+encodeURIComponent(orderId)+"/invoice-file",{method:"POST"});
      const data=await r.json();
      if(!r.ok)throw new Error(data.error||"Invoice storage failed.");
      setMessage("Invoice saved to Telegram.");
    }catch(error){setMessage(error instanceof Error?error.message:"Invoice storage failed.");}
    finally{setBusy(false);}
  }
  return <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginTop:10}}>
    <button type="button" onClick={store} disabled={busy} style={{background:"#142b4a",color:"#fff",border:0,borderRadius:8,padding:"10px 14px",fontWeight:700,cursor:busy?"wait":"pointer",opacity:busy?.65:1}}>{busy?"Saving to Telegram…":"Save invoice to Telegram"}</button>
    <a href={"/api/admin/orders/"+encodeURIComponent(orderId)+"/invoice-file"} style={{border:"1px solid #d1d5db",borderRadius:8,padding:"10px 14px",color:"#142b4a",textDecoration:"none",fontWeight:600}}>Download saved invoice</a>
    {message&&<span role="status" style={{fontSize:13,color:message.includes("saved")?"#166534":"#b91c1c"}}>{message}</span>}
  </div>;
}
