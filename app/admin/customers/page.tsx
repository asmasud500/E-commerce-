"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import AdminSidebar from "@/components/AdminSidebar";
type Customer={id:string;name:string;email:string;createdAt:string;orderCount:number;reviewCount:number;paidSpend:number};
const money=(n:number)=>"৳"+n.toLocaleString("en-BD",{maximumFractionDigits:2});
export default function CustomersPage(){
 const [rows,setRows]=useState<Customer[]>([]),[query,setQuery]=useState(""),[error,setError]=useState("");
 useEffect(()=>{fetch("/api/admin/customers").then(async r=>{if(!r.ok)throw Error("Could not load customers");setRows(await r.json())}).catch(e=>setError(e.message))},[]);
 const filtered=useMemo(()=>rows.filter(x=>(x.name+" "+x.email).toLowerCase().includes(query.toLowerCase())),[rows,query]);
 function exportCsv(){const lines=[["Name","Email","Orders","Paid spend (BDT)","Reviews","Joined"],...filtered.map(x=>[x.name,x.email,x.orderCount,x.paidSpend,x.reviewCount,new Date(x.createdAt).toISOString()])];const csv=lines.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="customers.csv";a.click();URL.revokeObjectURL(url)}
 return <div className="admin-layout"><AdminSidebar/><main className="admin-content"><Link href="/admin">← Dashboard</Link><div className="admin-heading-row"><div><h1>Customers</h1><p>Live customer records, purchase totals and review activity.</p></div><button className="admin-primary-action" onClick={exportCsv}>Export CSV</button></div><input aria-label="Search customers" placeholder="Search name or email…" value={query} onChange={e=>setQuery(e.target.value)} className="admin-search-input"/>{error&&<p role="alert">{error}</p>}<div className="admin-table-wrap"><table><thead><tr><th>Customer</th><th>Email</th><th>Orders</th><th>Paid spend</th><th>Reviews</th><th>Joined</th></tr></thead><tbody>{filtered.map(c=><tr key={c.id}><td><b>{c.name}</b></td><td>{c.email}</td><td>{c.orderCount}</td><td>{money(c.paidSpend)}</td><td>{c.reviewCount}</td><td>{new Date(c.createdAt).toLocaleDateString("en-BD")}</td></tr>)}</tbody></table>{!filtered.length&&<p className="admin-empty">No customers match this search.</p>}</div></main></div>
}