"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import AdminSidebar from "@/components/AdminSidebar";
type Entry={id:string;actorId:string|null;action:string;entity:string;entityId:string|null;metadata:unknown;createdAt:string};
export default function ActivityPage(){
 const [rows,setRows]=useState<Entry[]>([]),[query,setQuery]=useState(""),[error,setError]=useState("");
 useEffect(()=>{fetch("/api/admin/activity").then(async r=>{if(!r.ok)throw Error("Could not load activity history");setRows(await r.json())}).catch(e=>setError(e.message))},[]);
 const filtered=useMemo(()=>rows.filter(x=>(x.action+" "+x.entity+" "+(x.entityId||"")+" "+JSON.stringify(x.metadata||"")).toLowerCase().includes(query.toLowerCase())),[rows,query]);
 return <div className="admin-layout"><AdminSidebar/><main className="admin-content"><Link href="/admin">← Dashboard</Link><div className="admin-heading-row"><div><h1>Activity Log</h1><p>Recent actions recorded by the store backend.</p></div><span className="admin-module-tag">{rows.length} records loaded</span></div><input className="admin-search-input" placeholder="Search actions, entities or IDs…" value={query} onChange={e=>setQuery(e.target.value)}/>{error&&<p role="alert">{error}</p>}<div className="admin-table-wrap"><table><thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>Entity ID</th><th>Actor</th><th>Details</th></tr></thead><tbody>{filtered.map(x=><tr key={x.id}><td>{new Date(x.createdAt).toLocaleString("en-BD")}</td><td><b>{x.action}</b></td><td>{x.entity}</td><td>{x.entityId||"—"}</td><td>{x.actorId||"System / not recorded"}</td><td><code>{JSON.stringify(x.metadata||{})}</code></td></tr>)}</tbody></table>{!filtered.length&&<p className="admin-empty">No activity records match this search.</p>}</div></main></div>
}