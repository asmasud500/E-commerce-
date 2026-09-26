"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
type O={id:string;orderNumber:string;customerName:string;total:number;paymentStatus:string;status:string};
const statuses=["PENDING","CONFIRMED","PROCESSING","SHIPPED","DELIVERED","CANCELLED","REFUNDED"];
export default function Orders(){const [orders,setOrders]=useState<O[]>([]);const [error,setError]=useState("");
 async function load(){const r=await fetch("/api/admin/orders");if(r.ok)setOrders(await r.json());else setError("Unable to load orders")}
 useEffect(()=>{load()},[]);
 async function change(id:string,status:string){const r=await fetch("/api/admin/orders/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});if(r.ok)load();else setError((await r.json()).error||"Update failed")}
 return <main style={{maxWidth:1200,margin:"auto",padding:32}}><Link href="/admin">← Dashboard</Link><h1>Orders</h1>{error&&<p>{error}</p>}<div style={{overflowX:"auto",marginTop:24}}><table style={{width:"100%",background:"#fff",borderCollapse:"collapse"}}><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td>{o.orderNumber}</td><td>{o.customerName}</td><td>৳{o.total.toLocaleString("en-BD")}</td><td>{o.paymentStatus}</td><td><select value={o.status} onChange={e=>change(o.id,e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table></div>{!orders.length&&<p>No orders yet.</p>}</main>}
