"use client";
import AdminSidebar from "@/components/AdminSidebar";
import {useEffect,useState} from "react";
type T={id:string;orderNumber:string;gateway:string;amount:number;status:string;reference:string|null;providerTransactionId:string|null;verifiedAt:string|null;createdAt:string};
export default function PaymentTransactions(){
 const [rows,setRows]=useState<T[]>([]);
 useEffect(()=>{fetch("/api/admin/payment-transactions").then(r=>r.json()).then(setRows)},[]);
 return <div className="admin-layout"><AdminSidebar/><main className="admin-content" style={{maxWidth:1200,margin:"auto",padding:32}}>
  <a href="/admin">← Admin</a><h1>Payment Transactions</h1>
  <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th>Order</th><th>Gateway</th><th>Amount</th><th>Status</th><th>Reference</th><th>Verified</th></tr></thead>
  <tbody>{rows.map(x=><tr key={x.id}><td>{x.orderNumber}</td><td>{x.gateway}</td><td>৳{x.amount.toLocaleString("en-BD")}</td><td>{x.status}</td><td>{x.reference||"—"}</td><td>{x.verifiedAt?new Date(x.verifiedAt).toLocaleString():"—"}</td></tr>)}</tbody></table></div>
  {!rows.length&&<p>No payment transactions yet.</p>}
 </main></div>
}
