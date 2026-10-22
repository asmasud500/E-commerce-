"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import AdminSidebar from "@/components/AdminSidebar";

type EventRow={id:string;actorId:string|null;action:string;entity:string;entityId:string|null;metadata:unknown;createdAt:string};
type StaffRow={id:string;name:string;email:string;role:string;active:boolean;lastLoginAt:string|null};

const pretty=(v:string)=>v.replace(/[_-]+/g," ").replace(/\s+/g," ").trim();
const timeLabel=(v:string)=>{const d=new Date(v);return Number.isNaN(d.getTime())?"Unknown time":d.toLocaleString("en-BD",{dateStyle:"medium",timeStyle:"short"});};

export default function SecurityPage(){
 const [events,setEvents]=useState<EventRow[]>([]);
 const [staff,setStaff]=useState<StaffRow[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const [activityRes,staffRes]=await Promise.all([
    fetch("/api/admin/activity",{cache:"no-store"}),
    fetch("/api/admin/staff",{cache:"no-store"})
   ]);
   const [activityJson,staffJson]=await Promise.all([activityRes.json(),staffRes.json()]);
   if(!activityRes.ok)throw new Error(activityJson.error||"Could not load security events.");
   if(!staffRes.ok)throw new Error(staffJson.error||"Could not load staff login details.");
   setEvents(Array.isArray(activityJson)?activityJson:[]);
   setStaff(Array.isArray(staffJson)?staffJson:[]);
  }catch(e){setError(e instanceof Error?e.message:"Security data could not be loaded.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 const logins=useMemo(()=>events.filter(e=>e.action==="ADMIN_LOGIN"||e.action==="ADMIN_LOGIN_FAILED"),[events]);
 const failed=useMemo(()=>logins.filter(e=>e.action==="ADMIN_LOGIN_FAILED"),[logins]);
 const changes=useMemo(()=>events.filter(e=>/SETTING|STAFF|PERMISSION|GATEWAY|INTEGRATION|PASSWORD|ROLE/i.test(e.action)),[events]);
 const recentFailures=useMemo(()=>failed.filter(e=>Date.now()-new Date(e.createdAt).getTime()<24*60*60*1000),[failed]);
 const fmtActor=(v:string|null)=>v||"Actor not recorded";
 return <div className="admin-layout"><AdminSidebar/><main className="admin-content">
  <div className="admin-kicker">MART · SECURITY CENTER</div><Link href="/admin" className="admin-back-link">← Dashboard</Link>
  <div className="admin-heading-row"><div><h1>Security &amp; Audit Logs</h1><p>Review recorded admin sign-ins, failed login attempts and sensitive configuration changes.</p></div><button className="admin-secondary-action" onClick={()=>void load()} disabled={loading}>{loading?"Refreshing…":"Refresh security data"}</button></div>
  {error&&<div className="admin-report-alert" role="alert"><strong>Security data unavailable</strong><span>{error}</span><button onClick={()=>void load()}>Retry</button></div>}
  {loading&&!events.length&&<div className="admin-report-loading" role="status">Loading saved audit records…</div>}
  <div className="admin-stat-grid">
   <article className="admin-stat"><span>Recorded sign-ins</span><strong>{logins.filter(e=>e.action==="ADMIN_LOGIN").length}</strong><small>Within the loaded audit history</small></article>
   <article className="admin-stat"><span>Failed sign-ins</span><strong>{failed.length}</strong><small>Within the loaded audit history</small></article>
   <article className="admin-stat"><span>Failed sign-ins · 24 hours</span><strong>{recentFailures.length}</strong><small>Based on recorded timestamps</small></article>
   <article className="admin-stat"><span>Active staff accounts</span><strong>{staff.filter(s=>s.active).length}</strong><small>{staff.length} staff accounts loaded</small></article>
  </div>
  <section className="admin-recent" style={{marginBottom:22}}>
   <div className="admin-heading-row"><div><h2>Security alerts</h2><p>Alerts are based only on recorded events; this is not a real-time intrusion detection system.</p></div></div>
   {recentFailures.length>0?<div role="alert" className="admin-report-alert"><strong>{recentFailures.length} failed admin sign-in attempt{recentFailures.length===1?"":"s"} recorded in the last 24 hours</strong><span>Review the sign-in history below and verify that the attempts are expected.</span></div>:<div className="admin-empty">{loading?"Checking recorded failed sign-ins…":"No failed sign-ins were recorded in the loaded 24-hour window."}</div>}
   <div className="admin-settings-note" style={{marginTop:12}}><strong>Coverage</strong><p>Successful and invalid-credential sign-ins are recorded. Rate-limit events, IP reputation checks, automated lockout rules and alert delivery are not represented here.</p></div>
  </section>
  <section className="admin-recent" style={{marginBottom:22}}>
   <div className="admin-heading-row"><div><h2>Login history</h2><p>Latest successful and failed sign-in events from the audit log.</p></div></div>
   <div className="admin-table-wrap"><table><thead><tr><th>Time</th><th>Event</th><th>Account</th><th>Result</th></tr></thead><tbody>
    {logins.slice(0,50).map(e=><tr key={e.id}><td>{timeLabel(e.createdAt)}</td><td>{pretty(e.action)}</td><td>{fmtActor(e.actorId)}</td><td><span className={e.action==="ADMIN_LOGIN_FAILED"?"admin-stock-badge admin-stock-badge-out":"admin-stock-badge"}>{e.action==="ADMIN_LOGIN_FAILED"?"Failed":"Successful"}</span></td></tr>)}
   </tbody></table>{!loading&&!logins.length&&<p className="admin-empty">No login events are available in the current audit history.</p>}</div>
  </section>
  <section className="admin-recent" style={{marginBottom:22}}>
   <div className="admin-heading-row"><div><h2>Staff access &amp; last login</h2><p>Current staff accounts and their latest recorded successful login timestamp.</p></div><Link href="/admin/staff" className="admin-secondary-action">Manage staff</Link></div>
   <div className="admin-table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th></tr></thead><tbody>
    {staff.map(s=><tr key={s.id}><td>{s.name}</td><td>{s.email}</td><td>{pretty(s.role)}</td><td>{s.active?"Active":"Inactive"}</td><td>{s.lastLoginAt?timeLabel(s.lastLoginAt):"Never recorded"}</td></tr>)}
   </tbody></table>{!loading&&!staff.length&&<p className="admin-empty">No staff accounts found.</p>}</div>
  </section>
  <section className="admin-recent">
   <div className="admin-heading-row"><div><h2>Sensitive configuration changes</h2><p>Recent audit events related to settings, staff, permissions, gateways and integrations.</p></div><Link href="/admin/activity" className="admin-secondary-action">Open full activity log</Link></div>
   <div className="admin-table-wrap"><table><thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>Actor</th></tr></thead><tbody>
    {changes.slice(0,30).map(e=><tr key={e.id}><td>{timeLabel(e.createdAt)}</td><td>{pretty(e.action)}</td><td>{pretty(e.entity)}{e.entityId?" · "+e.entityId:""}</td><td>{fmtActor(e.actorId)}</td></tr>)}
   </tbody></table>{!loading&&!changes.length&&<p className="admin-empty">No matching configuration changes are present in the loaded audit history.</p>}</div>
  </section>
  <p className="admin-footnote">Audit queries currently load the latest records exposed by the existing activity API. This page does not claim to show events older than that API window, and it never displays passwords, gateway secrets or session tokens.</p>
 </main></div>;
}
