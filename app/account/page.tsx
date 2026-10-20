"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import StoreHeader from "@/components/StoreHeader";
import StoreFooter from "@/components/StoreFooter";
import {Icon} from "@/components/Icons";

const tone=(s:string)=>s==="PAID"||s==="DELIVERED"||s==="CONFIRMED"?"ok":s==="FAILED"||s==="CANCELLED"||s==="REFUNDED"?"bad":"wait";
const money=(n:any)=>Number(n||0).toLocaleString("en-BD",{maximumFractionDigits:2});
export default function Account(){
 const [user,setUser]=useState<any>(null),[isAdmin,setIsAdmin]=useState(false),[orders,setOrders]=useState<any[]>([]),[loading,setLoading]=useState(true);
 const [query,setQuery]=useState(""),[filter,setFilter]=useState("ALL"),[busy,setBusy]=useState(""),[notice,setNotice]=useState("");
 const load=useCallback(async()=>{setLoading(true);try{const [u,o]=await Promise.all([fetch("/api/customer/auth/me",{cache:"no-store"}),fetch("/api/account/orders",{cache:"no-store"})]);const ud=u.ok?await u.json():null;const od=o.ok?await o.json():[];setUser(ud?.user||null);setIsAdmin(!!ud?.isAdmin);setOrders(Array.isArray(od)?od:[])}catch{setNotice("Could not load your account. Please refresh and try again.")}finally{setLoading(false)}},[]);
 useEffect(()=>{void load()},[load]);
 async function logout(){try{await fetch("/api/customer/auth/logout",{method:"POST"})}finally{location.href="/account/login"}}
 async function cancelOrder(orderNumber:string){if(!confirm("Cancel order "+orderNumber+"? This cannot be undone."))return;setBusy(orderNumber);setNotice("");try{const r=await fetch("/api/account/orders/cancel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderNumber})});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"Could not cancel this order.");setNotice("Order "+orderNumber+" was cancelled.");await load()}catch(e){setNotice(e instanceof Error?e.message:"Could not cancel this order.")}finally{setBusy("")}}
 const visible=useMemo(()=>orders.filter(o=>{const q=query.trim().toLowerCase();const matches=!q||String(o.orderNumber||"").toLowerCase().includes(q)||o.items?.some((i:any)=>String(i.name||"").toLowerCase().includes(q));return matches&&(filter==="ALL"||o.status===filter)}),[orders,query,filter]);
 if(loading)return <><StoreHeader/><main className="pg"><p>Loading your account…</p></main><StoreFooter/></>;
 if(!user)return <><StoreHeader/><main className="pg"><div className="pg-card pg-empty"><span className="pg-empty-ic"><Icon name="user" size={26}/></span><h2>My account</h2><p>Please log in to view and manage your orders.</p><Link href="/account/login" className="pg-btn">Log in</Link></div></main><StoreFooter/></>;
 return <><StoreHeader/><main className="pg">
  <nav className="pg-crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevronRight" size={14}/><b>My account</b></nav>
  <div className="pg-card ac-me"><span className="ac-av" aria-hidden="true">{String(user.name||user.email||"?").charAt(0).toUpperCase()}</span><div><h1>{user.name||"My account"}</h1><p>{user.email}</p></div><div className="ac-btns">{isAdmin&&<Link href="/admin/login" className="pg-btn pg-btn-navy">Admin panel</Link>}<button type="button" className="pg-btn pg-btn-line" onClick={logout}>Log out</button></div></div>
  <div className="hp-sec-h hp-tab ac-h"><h2>My orders</h2><span>{orders.length} total</span></div>
  {notice&&<div className="pg-card" role="status" style={{padding:14,marginBottom:16}}>{notice}</div>}
  {orders.length>0&&<div className="pg-card" style={{padding:16,marginBottom:18,display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(140px,220px)",gap:12}}><input aria-label="Search orders" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search order number or product…" style={{minWidth:0,padding:"12px 14px",border:"1px solid #d9dee7",borderRadius:10}}/><select aria-label="Filter orders by status" value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:"12px",border:"1px solid #d9dee7",borderRadius:10,background:"white"}}><option value="ALL">All statuses</option>{["PENDING","CONFIRMED","PROCESSING","SHIPPED","DELIVERED","CANCELLED","REFUNDED"].map(s=><option key={s} value={s}>{s}</option>)}</select></div>}
  {!visible.length?<div className="pg-card pg-empty"><span className="pg-empty-ic"><Icon name="bag" size={26}/></span><h2>{orders.length?"No matching orders":"No orders yet"}</h2><p>{orders.length?"Try another search or status filter.":"When you place an order it will appear here."}</p><Link href="/products" className="pg-btn">Start shopping</Link></div>:
  <div className="ac-orders">{visible.map(o=><article key={o.id} className="pg-card ac-order">
   <div className="ac-order-top"><b>{o.orderNumber}</b><strong>৳{money(o.total)}</strong></div>
   <div className="ac-tags"><span className={"tag "+tone(o.paymentStatus)}>Payment: {o.paymentStatus}</span><span className={"tag "+tone(o.status)}>Status: {o.status}</span></div>
   <small>Placed {o.createdAt?new Date(o.createdAt).toLocaleString():"—"}</small>
   <ul>{(o.items||[]).map((i:any)=><li key={i.id}>{i.name} × {i.quantity} <span>— ৳{money(i.lineTotal)}</span></li>)}</ul>
   <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:14}}>
    <Link href={"/track?order="+encodeURIComponent(o.orderNumber)} className="pg-btn pg-btn-navy">Track order</Link>
    {o.status==="PENDING"&&o.paymentStatus==="PENDING"&&<button type="button" className="pg-btn pg-btn-line" disabled={busy===o.orderNumber} onClick={()=>void cancelOrder(o.orderNumber)}>{busy===o.orderNumber?"Cancelling…":"Cancel order"}</button>}
    {o.status==="DELIVERED"&&<Link href={"/track?order="+encodeURIComponent(o.orderNumber)} className="pg-btn pg-btn-line">Return / refund options</Link>}
    <Link href="/products" className="pg-btn pg-btn-line">Shop again</Link>
   </div>
  </article>)}</div>}
 </main><StoreFooter/></>}
