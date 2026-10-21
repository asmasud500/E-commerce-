"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import StoreHeader from "@/components/StoreHeader";
import StoreFooter from "@/components/StoreFooter";
import {Icon} from "@/components/Icons";
import InvoiceDownloadButton from "@/components/InvoiceDownloadButton";

const tone=(s:string)=>s==="PAID"||s==="DELIVERED"||s==="CONFIRMED"?"ok":s==="FAILED"||s==="CANCELLED"||s==="REFUNDED"?"bad":"wait";
const money=(n:any)=>Number(n||0).toLocaleString("en-BD",{maximumFractionDigits:2});
export default function Account(){
 const [user,setUser]=useState<any>(null),[isAdmin,setIsAdmin]=useState(false),[orders,setOrders]=useState<any[]>([]),[loading,setLoading]=useState(true);
 const [query,setQuery]=useState(""),[filter,setFilter]=useState("ALL"),[busy,setBusy]=useState(""),[notice,setNotice]=useState(""),[loadError,setLoadError]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setLoadError("");setNotice("");
  const timedFetch=async(url:string,ms:number)=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),ms);try{return await fetch(url,{cache:"no-store",signal:controller.signal})}finally{clearTimeout(timer)}};
  try{
   const response=await timedFetch("/api/customer/auth/me",8000);
   if(!response.ok)throw new Error("Could not verify your account session. Please sign in again.");
   const data=await response.json();
   setUser(data?.user||null);setIsAdmin(!!data?.isAdmin);
   if(!data?.user){setOrders([]);setLoading(false);return}
   // Do not block the account page on the slower orders query.
   setLoading(false);
   try{
    const orderResponse=await timedFetch("/api/account/orders",8000);
    if(orderResponse.status===401){setUser(null);setOrders([]);return}
    if(!orderResponse.ok)throw new Error("Orders could not be loaded.");
    const orderData=await orderResponse.json();
    setOrders(Array.isArray(orderData)?orderData:[]);
   }catch(e){
    setNotice(e instanceof Error&&e.name==="AbortError"?"Your account loaded, but orders are taking too long. Please retry.":e instanceof Error?e.message:"Orders could not be loaded.");
   }
  }catch(e){
   setLoadError(e instanceof Error&&e.name==="AbortError"?"Account verification timed out. Check your connection and try again.":e instanceof Error?e.message:"Could not load your account. Please retry.");
  }finally{setLoading(false)}
 },[]);
 useEffect(()=>{void load()},[load]);
 async function logout(){try{await fetch("/api/customer/auth/logout",{method:"POST"})}finally{location.href="/account/login"}}
 async function cancelOrder(orderNumber:string){if(!confirm("Cancel order "+orderNumber+"? This cannot be undone."))return;setBusy(orderNumber);setNotice("");try{const r=await fetch("/api/account/orders/cancel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderNumber})});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"Could not cancel this order.");setNotice("Order "+orderNumber+" was cancelled.");await load()}catch(e){setNotice(e instanceof Error?e.message:"Could not cancel this order.")}finally{setBusy("")}}
 const visible=useMemo(()=>orders.filter(o=>{const q=query.trim().toLowerCase();const matches=!q||String(o.orderNumber||"").toLowerCase().includes(q)||o.items?.some((i:any)=>String(i.name||"").toLowerCase().includes(q));return matches&&(filter==="ALL"||o.status===filter)}),[orders,query,filter]);
 if(loading)return <><StoreHeader/><main className="pg" style={{minHeight:"58vh",paddingTop:32,paddingBottom:56}}>
  <nav className="pg-crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevronRight" size={14}/><b>My account</b></nav>
  <section className="pg-card" aria-busy="true" aria-live="polite" style={{padding:"clamp(20px,4vw,32px)",borderRadius:18,background:"white",border:"1px solid #e7eaf0",boxShadow:"0 12px 36px rgba(18,35,59,.06)"}}>
   <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",paddingBottom:22,borderBottom:"1px solid #edf0f4"}}>
    <div style={{width:64,height:64,borderRadius:"50%",background:"#edf0f4",flexShrink:0}}/>
    <div style={{flex:1,minWidth:170}}><div style={{height:19,width:160,maxWidth:"75%",borderRadius:7,background:"#e8ebf0",marginBottom:10}}/><div style={{height:13,width:220,maxWidth:"90%",borderRadius:6,background:"#f0f2f5"}}/></div>
    <div style={{height:40,width:92,borderRadius:10,background:"#f0f2f5"}}/>
   </div>
   <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",padding:"24px 0 18px"}}><div><h1 style={{fontSize:"clamp(22px,4vw,28px)",fontWeight:800,color:"#14253e",margin:0}}>My Orders</h1><p style={{color:"#697586",margin:"7px 0 0",fontSize:14}}>Preparing your account and order details…</p></div><div style={{height:38,width:116,borderRadius:10,background:"#fff0e6",border:"1px solid #ffddc7"}}/></div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:14}}>
    {[1,2].map(n=><div key={n} style={{border:"1px solid #edf0f4",borderRadius:14,padding:16}}>
     <div style={{height:12,width:100,borderRadius:6,background:"#e9edf2",marginBottom:14}}/>
     <div style={{height:16,width:"65%",borderRadius:6,background:"#e9edf2",marginBottom:18}}/>
     <div style={{height:10,width:"90%",borderRadius:6,background:"#f0f2f5",marginBottom:9}}/>
     <div style={{height:10,width:"55%",borderRadius:6,background:"#f0f2f5"}}/>
    </div>)}
   </div>
   <div style={{marginTop:18,padding:12,background:"#f8fafc",borderRadius:10,color:"#687588",fontSize:13,display:"flex",alignItems:"center",gap:9}}><span style={{width:8,height:8,borderRadius:"50%",background:"#ff6b12",flexShrink:0}}/>Your private order information will appear here once loading finishes.</div>
  </section>
 </main><StoreFooter/></>;
 if(loadError)return <><StoreHeader/><main className="pg" style={{minHeight:"55vh",paddingTop:32,paddingBottom:56}}><nav className="pg-crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevronRight" size={14}/><b>My account</b></nav><section className="pg-card pg-empty" role="alert"><span className="pg-empty-ic"><Icon name="user" size={26}/></span><h2>Could not load your account</h2><p>{loadError}</p><button type="button" className="pg-btn" onClick={()=>void load()}>Try again</button><Link href="/account/login" className="pg-btn pg-btn-line">Sign in again</Link></section></main><StoreFooter/></>;
 if(!user)return <><StoreHeader/><main className="pg"><div className="pg-card pg-empty"><span className="pg-empty-ic"><Icon name="user" size={26}/></span><h2>My account</h2><p>Please log in to view and manage your orders.</p><Link href="/account/login" className="pg-btn">Log in</Link></div></main><StoreFooter/></>;
 return <><StoreHeader/><main className="pg">
  <nav className="pg-crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevronRight" size={14}/><b>My account</b></nav>
  <div className="pg-card ac-me"><span className="ac-av" aria-hidden="true">{String(user.name||user.email||"?").charAt(0).toUpperCase()}</span><div><h1>{user.name||"My account"}</h1><p>{user.email}</p></div><div className="ac-btns">{isAdmin&&<Link href="/admin/login" className="pg-btn pg-btn-navy">Admin panel</Link>}<button type="button" className="pg-btn pg-btn-line" onClick={logout}>Log out</button></div></div>
  <div className="hp-sec-h hp-tab ac-h"><h2>My orders</h2><span>{orders.length} total</span></div>
  {notice&&<div className="pg-card" role="status" style={{padding:14,marginBottom:16}}>{notice}</div>}
  {orders.length>0&&<div className="pg-card ac-order-filters"><input aria-label="Search orders" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search order number or product…" style={{minWidth:0,padding:"12px 14px",border:"1px solid #d9dee7",borderRadius:10}}/><select aria-label="Filter orders by status" value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:"12px",border:"1px solid #d9dee7",borderRadius:10,background:"white"}}><option value="ALL">All statuses</option>{["PENDING","CONFIRMED","PROCESSING","SHIPPED","DELIVERED","CANCELLED","REFUNDED"].map(s=><option key={s} value={s}>{s}</option>)}</select></div>}
  {!visible.length?<div className="pg-card pg-empty"><span className="pg-empty-ic"><Icon name="bag" size={26}/></span><h2>{orders.length?"No matching orders":"No orders yet"}</h2><p>{orders.length?"Try another search or status filter.":"When you place an order it will appear here."}</p><Link href="/products" className="pg-btn">Start shopping</Link></div>:
  <div className="ac-orders">{visible.map(o=><article key={o.id} className="pg-card ac-order">
   <div className="ac-order-top"><b>{o.orderNumber}</b><strong>৳{money(o.total)}</strong></div>
   <div className="ac-tags"><span className={"tag "+tone(o.paymentStatus)}>Payment: {o.paymentStatus}</span><span className={"tag "+tone(o.status)}>Status: {o.status}</span></div>
   <small>Placed {o.createdAt?new Date(o.createdAt).toLocaleString():"—"}</small>
   <ul>{(o.items||[]).map((i:any)=><li key={i.id}>{i.name} × {i.quantity} <span>— ৳{money(i.lineTotal)}</span></li>)}</ul>
   <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:14}}>
    <Link href={"/track?order="+encodeURIComponent(o.orderNumber)} className="pg-btn pg-btn-navy">Track order</Link>
    <InvoiceDownloadButton orderId={o.id}/>
    {o.status==="PENDING"&&o.paymentStatus==="PENDING"&&<button type="button" className="pg-btn pg-btn-line" disabled={busy===o.orderNumber} onClick={()=>void cancelOrder(o.orderNumber)}>{busy===o.orderNumber?"Cancelling…":"Cancel order"}</button>}
    {o.status==="DELIVERED"&&<Link href={"/track?order="+encodeURIComponent(o.orderNumber)} className="pg-btn pg-btn-line">Return / refund options</Link>}
    <Link href="/products" className="pg-btn pg-btn-line">Shop again</Link>
   </div>
  </article>)}</div>}
 </main><StoreFooter/></>}
