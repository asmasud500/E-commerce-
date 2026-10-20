import {notFound} from "next/navigation";
import {db} from "@/lib/prisma";
import PrintButton from "./PrintButton";
import TelegramInvoiceStorageButton from "./TelegramInvoiceStorageButton";
export const dynamic="force-dynamic";
const tk=(n:unknown)=>"৳"+Number(n||0).toLocaleString("en-BD",{maximumFractionDigits:2});
export default async function Invoice({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const o:any=await db.order.findUnique({where:{id},include:{items:true,paymentGateway:true}});
  if(!o)return notFound();
  const s:any=await db.storeSetting.findUnique({where:{id:"store"}}).catch(()=>null);
  return <main style={{maxWidth:780,margin:"24px auto",padding:24,background:"#fff",color:"#111",fontFamily:"Inter,Arial,sans-serif"}}>
    <style>{`@media print{.no-print{display:none!important}body{background:#fff}}`}</style>
    <div className="no-print" style={{marginBottom:16}}><PrintButton/><TelegramInvoiceStorageButton orderId={id}/></div>
    <div style={{display:"flex",justifyContent:"space-between",borderBottom:"2px solid #131921",paddingBottom:12}}>
      <div><h1 style={{margin:0}}>{s?.storeName||"MART Store"}</h1><small>{s?.supportPhone||""} {s?.supportEmail||""}</small></div>
      <div style={{textAlign:"right"}}><strong>INVOICE</strong><br/>{o.orderNumber}<br/><small>{new Date(o.createdAt).toLocaleDateString("en-GB")}</small></div>
    </div>
    <section style={{margin:"16px 0",lineHeight:1.5}}>
      <strong>Bill to</strong><br/>{o.customerName}<br/>{o.customerPhone}{o.customerEmail?<><br/>{o.customerEmail}</>:null}<br/>{o.shippingAddress}{[o.shippingUpazila,o.shippingDistrict,o.shippingDivision].filter(Boolean).length?<><br/>{[o.shippingUpazila,o.shippingDistrict,o.shippingDivision].filter(Boolean).join(", ")}</>:null}
    </section>
    <table style={{width:"100%",borderCollapse:"collapse"}}>
      <thead><tr style={{background:"#f3f4f6",textAlign:"left"}}><th style={{padding:8}}>Item</th><th>Qty</th><th>Price</th><th style={{textAlign:"right"}}>Total</th></tr></thead>
      <tbody>{(o.items||[]).map((i:any)=><tr key={i.id} style={{borderBottom:"1px solid #e5e7eb"}}><td style={{padding:8}}>{i.name}</td><td>{i.quantity}</td><td>{tk(i.unitPrice)}</td><td style={{textAlign:"right"}}>{tk(i.lineTotal)}</td></tr>)}</tbody>
    </table>
    <div style={{marginLeft:"auto",width:260,marginTop:14,lineHeight:1.8}}>
      <div style={{display:"flex",justifyContent:"space-between"}}><span>Subtotal</span><span>{tk(o.subtotal)}</span></div>
      {Number(o.discount)>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span>Discount{o.couponCode?" ("+o.couponCode+")":""}</span><span>-{tk(o.discount)}</span></div>}
      <div style={{display:"flex",justifyContent:"space-between"}}><span>Delivery</span><span>{tk(o.shippingFee)}</span></div>
      {Number(o.taxAmount)>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span>Tax</span><span>{tk(o.taxAmount)}</span></div>}
      <div style={{display:"flex",justifyContent:"space-between",fontWeight:800,borderTop:"2px solid #131921",paddingTop:6}}><span>Total</span><span>{tk(o.total)}</span></div>
    </div>
    <p style={{marginTop:18}}>Payment: <strong>{o.paymentStatus}</strong>{o.paymentGateway?" via "+o.paymentGateway.name:""}</p>
    <p style={{color:"#6b7280",fontSize:13}}>Thank you for shopping with us.</p>
  </main>;
}
