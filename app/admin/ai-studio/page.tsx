"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";

const FEATURES = [
  { id:"product-description", title:"AI Product Description", desc:"Generate SEO-friendly product copy and benefits. Drafts require review." },
  { id:"smart-search", title:"Smart Product Search", desc:"Find relevant products from the published catalog using natural language." },
  { id:"customer-support", title:"AI Customer Support", desc:"Answer general product questions from available catalog facts." },
  { id:"sales-analyst", title:"AI Sales Analyst", desc:"Summarize server-calculated order and revenue aggregates." },
  { id:"marketing-studio", title:"AI Marketing Studio", desc:"Create campaign ideas, social captions and a practical content plan." },
  { id:"shopping-assistant", title:"AI Shopping Assistant", desc:"Help shoppers compare products found in the store catalog." },
  { id:"seo-auditor", title:"AI SEO Auditor", desc:"Audit real published-product metadata and save prioritized fixes for review." },
  { id:"inventory-assistant", title:"AI Inventory Assistant", desc:"Review low-stock and out-of-stock products without changing inventory." },
  { id:"review-analyzer", title:"AI Review Analyzer", desc:"Summarize approved customer reviews and recurring product feedback." },
  { id:"storefront-audit", title:"AI Storefront UX Audit", desc:"Create a prioritized UX/accessibility audit from store context and your notes." },
  { id:"creative-studio", title:"AI Banner & Creative Studio", desc:"Create banner copy, layout briefs and image-generation prompts; no automatic publishing." },
  { id:"workflow-planner", title:"AI Workflow Planner", desc:"Design safe automation plans with approvals, retries, logs and test cases." },
  { id:"security-assistant", title:"AI Security & Error Assistant", desc:"Analyze redacted errors and suggest defensive fixes; never edits production code." },
  { id:"admin-page-assistant", title:"AI Admin Page Assistant", desc:"Provide page-aware advice using approved read-only database context; operational changes always require human action." }
] as const;
type AnyObj = Record<string, any>;
const featureName = (id:string) => FEATURES.find(f=>f.id===id)?.title || id;

export default function AiStudioPage() {
  const [data,setData] = useState<AnyObj|null>(null);
  const [products,setProducts] = useState<AnyObj[]>([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [testing,setTesting] = useState(false);
  const [notice,setNotice] = useState("");
  const [tab,setTab] = useState("overview");
  const [settings,setSettings] = useState<AnyObj>({enabled:true,model:"gemini-3.1-flash-lite",features:{},dailyRequestLimit:300,maxOutputTokens:900});
  const [selected,setSelected] = useState("product-description");
  const [input,setInput] = useState("");
  const [productName,setProductName] = useState("");
  const [productId,setProductId] = useState("");
  const [dateRange,setDateRange] = useState("30");
  const [tone,setTone] = useState("professional");
  const [language,setLanguage] = useState("Bangla and English");
  const [generating,setGenerating] = useState(false);
  const [generated,setGenerated] = useState<AnyObj|null>(null);
  const [actionDraft,setActionDraft] = useState("");
  const [healthResult,setHealthResult] = useState<AnyObj|null>(null);
  const [healthRunning,setHealthRunning] = useState(false);
  const [healthHistory,setHealthHistory] = useState<AnyObj[]>([]);
  const [conversations,setConversations] = useState<AnyObj[]>([]);
  const [conversationLoading,setConversationLoading] = useState(false);
  const [selectedConversation,setSelectedConversation] = useState<string>("");
  const [maintenanceIssues,setMaintenanceIssues] = useState<AnyObj[]>([]);
  const [issueFilter,setIssueFilter] = useState("OPEN");
  useEffect(()=>{try{const saved=localStorage.getItem("mart-ai-studio-health-history-v1");if(saved){const parsed=JSON.parse(saved);if(Array.isArray(parsed))setHealthHistory(parsed.slice(0,20));}const issues=localStorage.getItem("mart-ai-studio-maintenance-issues-v1");if(issues){const parsed=JSON.parse(issues);if(Array.isArray(parsed))setMaintenanceIssues(parsed.slice(0,100));}}catch{/* Ignore malformed local history. */}},[]);
  function saveMaintenanceIssues(next:AnyObj[]) {
    setMaintenanceIssues(next);
    try{localStorage.setItem("mart-ai-studio-maintenance-issues-v1",JSON.stringify(next.slice(0,100)));}catch{/* Keep current session state if storage is unavailable. */}
  }
  function updateMaintenanceIssue(id:string,status:"OPEN"|"IN_PROGRESS"|"RESOLVED") {
    saveMaintenanceIssues(maintenanceIssues.map(issue=>issue.id===id?{...issue,status,updatedAt:new Date().toISOString(),timeline:[...(issue.timeline||[]),{status,at:new Date().toISOString()}]}:issue));
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/ai-studio",{cache:"no-store"});
      const j = await r.json();
      if(!r.ok) throw new Error(j.error || "AI Studio data could not be loaded.");
      setData(j); setSettings(j.settings);
      const productResponse = await fetch("/api/admin/products", { cache: "no-store" });
      if (productResponse.ok) { const productRows = await productResponse.json(); setProducts(Array.isArray(productRows) ? productRows : []); }
    } catch(e) { setNotice(e instanceof Error ? e.message : "AI Studio data could not be loaded."); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{ void load(); },[load]);

  const stats = data?.metrics || {};
  const dailyUsage: AnyObj[] = data?.dailyUsage || [];
  const maxDailyUsage = Math.max(1, ...dailyUsage.map((day:AnyObj)=>Number(day.total||0)));
  const featureStats = useMemo(()=>new Map<string, AnyObj>((data?.features||[]).map((x:AnyObj)=>[x.feature,x] as [string, AnyObj])),[data]);
  const setFeature = (id:string, enabled:boolean) => setSettings((s:AnyObj)=>({...s,features:{...(s.features||{}),[id]:enabled}}));

  async function save() {
    setSaving(true); setNotice("");
    try {
      const r=await fetch("/api/admin/ai-studio",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save",...settings})});
      const j=await r.json(); if(!r.ok)throw new Error(j.error||"Settings could not be saved.");
      setSettings(j.settings); setNotice("AI Studio settings saved."); await load();
    } catch(e) { setNotice(e instanceof Error?e.message:"Save failed."); }
    finally { setSaving(false); }
  }
  async function testConnection() {
    setTesting(true);setNotice("");
    try {
      const r=await fetch("/api/admin/ai-studio",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"test",model:settings.model})});
      const j=await r.json(); if(!r.ok||!j.ok)throw new Error(j.error||"Gemini connection test failed.");
      setNotice("Connection successful · "+j.model+" · "+j.latencyMs+" ms"); await load();
    } catch(e) { setNotice(e instanceof Error?e.message:"Connection test failed."); }
    finally { setTesting(false); }
  }
  async function runFeature() {
    setGenerating(true);setGenerated(null);setNotice("");
    try {
      const r=await fetch("/api/ai/"+selected,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input,productName,productId,tone,language,dateRange})});
      const j=await r.json(); if(!r.ok)throw new Error(j.error?.message||j.error||"AI request failed.");
      setGenerated(j);setNotice(j.draft?"Draft saved to the content library for review.":"AI response generated."); await load();
    } catch(e) {setNotice(e instanceof Error?e.message:"AI request failed.");}
    finally {setGenerating(false);}
  }
  async function reviewDraft(id:string,status:"APPROVED"|"REJECTED"|"ARCHIVED") {
    setActionDraft(id);setNotice("");
    try {
      const r=await fetch("/api/admin/ai-studio/drafts",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status})});
      const j=await r.json();if(!r.ok)throw new Error(j.error||"Draft status update failed.");
      setNotice("Draft marked "+status.toLowerCase()+". Approval does not publish it to the storefront.");await load();
    }catch(e){setNotice(e instanceof Error?e.message:"Draft review failed.");}
    finally{setActionDraft("");}
  }
  async function runWebsiteHealth() {
    setHealthRunning(true);setNotice("");
    try {
      const response=await fetch("/api/admin/website-health",{cache:"no-store"});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Website health check failed.");
      setHealthResult(result);
      const next=[{checkedAt:result.checkedAt,summary:result.summary,results:result.results},...healthHistory].slice(0,20);
      setHealthHistory(next);
      try{localStorage.setItem("mart-ai-studio-health-history-v1",JSON.stringify(next));}catch{/* History stays available for this session if storage is unavailable. */}
      setNotice(result.summary.status==="PASS"?"Website health check passed.":result.summary.failed+" failed and "+result.summary.warnings+" warning(s) found.");
    }catch(e){setNotice(e instanceof Error?e.message:"Website health check failed.");}
    finally{setHealthRunning(false);}
  }
  async function loadConversations() {
    setConversationLoading(true);
    try {
      const response=await fetch("/api/admin/ai-studio/conversations",{cache:"no-store"});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Chat history could not be loaded.");
      setConversations(Array.isArray(result.conversations)?result.conversations:[]);
      if(!selectedConversation&&result.conversations?.length)setSelectedConversation(result.conversations[0].id);
    } catch(e) { setNotice(e instanceof Error?e.message:"Chat history could not be loaded."); }
    finally { setConversationLoading(false); }
  }
  const tabs=[["overview","Overview"],["website-health","Maintenance Center"],["chat-history","Chat history"],["features","AI features"],["content","Content library"],["logs","Usage & logs"],["settings","Settings"]];

  return <div className="admin-layout"><AdminSidebar/><main className="admin-content ai-studio">
    <div className="admin-kicker">MART · WEBSITE OPERATIONS</div>
    <div className="ai-hero"><div><h1>AI Studio & Website Maintenance</h1><p>Monitor website health, track detected issues, review improvement history, and manage AI operations from one workspace.</p></div><div className={"ai-health "+(settings.enabled?"is-on":"is-off")}><i/> {settings.enabled?"AI controls enabled":"AI globally paused"}</div></div>
    {notice && <div className="ai-notice" role="status">{notice}<button type="button" onClick={()=>setNotice("")} aria-label="Dismiss notice">×</button></div>}
    <div className="ai-tabs" role="tablist" aria-label="AI Studio sections">{tabs.map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} className={tab===id?"active":""} onClick={()=>{setTab(id);if(id==="chat-history")void loadConversations();if(id==="website-health"&&!healthResult)void runWebsiteHealth();}}>{label}</button>)}</div>
    {loading && !data ? <div className="ai-panel"><p>Loading live AI Studio data…</p></div> : <>
      {tab==="overview" && <>
        <div className="ai-stat-grid">
          <article><span>Recorded requests · 7 days (up to 3,000)</span><strong>{stats.sampled ? "≥" + Number(stats.recordLimit||3000).toLocaleString() : (stats.total ?? "—")}</strong><small>Recorded provider attempts</small></article>
          <article><span>Success rate</span><strong>{stats.successRate==null?"—":stats.successRate+"%"}</strong><small>{stats.successes ?? 0} Gemini successes · {stats.fallbacks ?? 0} fallbacks{stats.sampled ? " in the latest 3,000-record sample" : ""}</small></article>
          <article><span>Average latency</span><strong>{stats.avgLatencyMs==null?"—":stats.avgLatencyMs+" ms"}</strong><small>{stats.sampled ? "Latest 3,000-record sample" : "From recorded successful requests and failures"}</small></article>
          <article><span>Token usage · 7 days</span><strong>{Number(stats.inputTokens||0)+Number(stats.outputTokens||0) ? (Number(stats.inputTokens||0)+Number(stats.outputTokens||0)).toLocaleString() : "—"}</strong><small>Only tokens reported by Gemini; “—” means none recorded</small></article>
        </div>
        <div className="ai-two-col">
          <section className="ai-panel"><div className="ai-panel-heading"><div><h2>Feature health</h2><p>Counts from up to 3,000 recent request logs in the last 7 days.</p></div><button type="button" onClick={()=>void load()}>Refresh</button></div>
            <div className="ai-feature-list">{FEATURES.map(f=>{const s:any=featureStats.get(f.id)||{};const enabled=settings.enabled&&settings.features?.[f.id]!==false;return <div className="ai-feature-row" key={f.id}><span className="ai-feature-mark">✦</span><div className="ai-feature-main"><strong>{f.title}</strong><small>{s.total??0} logged · {s.fallbacks??0} fallbacks · {s.errors??0} errors · {s.avgLatencyMs??0} ms avg</small></div><span className={"ai-pill "+(enabled?"good":"muted")}>{enabled?"Enabled":"Disabled"}</span></div>})}</div>
          </section>
          <section className="ai-panel"><h2>Service status</h2><p>Provider quota is not exposed by the Gemini API. Do not treat local request counts as Google quota.</p>
            <div className="ai-status-list"><div><span>Configured model</span><strong>{settings.model}</strong></div><div><span>Daily app-side cap (best-effort)</span><strong>{settings.dailyRequestLimit} requests</strong></div><div><span>Output token ceiling</span><strong>{settings.maxOutputTokens}</strong></div><div><span>Provider quota</span><strong>Check Google AI Studio</strong></div></div>
            <button className="ai-primary" onClick={()=>{setTab("settings");void testConnection();}} disabled={testing}>{testing?"Testing…":"Test Gemini connection"}</button>
          </section>
        </div>
        <section className="ai-panel ai-daily-chart"><div className="ai-panel-heading"><div><h2>Daily request activity</h2><p>Recorded requests by UTC day from the current telemetry sample, including fallback outcomes.</p></div></div>
          <div className="ai-daily-bars">{dailyUsage.map((day:AnyObj)=><div className="ai-daily-item" key={day.date}><div className="ai-daily-value">{day.total}</div><div className="ai-daily-track"><span style={{height:(day.total?Math.max(4,Number(day.total)/maxDailyUsage*100):0)+"%"}}/></div><small>{day.label}</small><em>{day.errors} errors · {day.fallbacks} fallback</em></div>)}</div>
          <div className="ai-chart-legend"><span><i/>Total recorded requests</span><span>Data may be truncated if the 3,000-record limit is reached.</span></div>
        </section>
      </>}
      {tab==="website-health" && <section className="ai-panel">
        <div className="ai-panel-heading"><div><h2>Website Maintenance & Improvement Center</h2><p>Run live production checks, convert warnings and failures into a trackable issue queue, and record maintenance progress. Checks are read-only; fixes require tests and verified deployment.</p></div><div className="ai-actions"><button onClick={()=>{const report={generatedAt:new Date().toISOString(),latest:healthResult,history:healthHistory,issues:maintenanceIssues};const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="mart-maintenance-report.json";a.click();URL.revokeObjectURL(url);}}>Export report</button><button className="ai-primary" onClick={()=>void runWebsiteHealth()} disabled={healthRunning}>{healthRunning?"Checking website…":"Run live health check"}</button></div></div>
        {<div className="ai-stat-grid">
          <article><span>Tracked issues</span><strong>{maintenanceIssues.filter(i=>i.status!=="RESOLVED").length}</strong><small>{maintenanceIssues.filter(i=>i.severity==="HIGH"&&i.status!=="RESOLVED").length} high priority</small></article>
          <article><span>Resolved issues</span><strong>{maintenanceIssues.filter(i=>i.status==="RESOLVED").length}</strong><small>Tracked in this browser</small></article>
          <article><span>Health reports</span><strong>{healthHistory.length+(healthResult&&!healthHistory.some(h=>h.checkedAt===healthResult.checkedAt)?1:0)}</strong><small>Latest reports kept locally</small></article>
          <article><span>Audit schedule</span><strong>Daily</strong><small>GitHub Actions · 08:00 Bangladesh time</small></article>
        </div>}
        {healthResult&&<><div className="ai-stat-grid">
          <article><span>Overall status</span><strong>{healthResult.summary.status}</strong><small>Checked {new Date(healthResult.checkedAt).toLocaleString()}</small></article>
          <article><span>Passed</span><strong>{healthResult.summary.passed}</strong><small>Expected response verified</small></article>
          <article><span>Warnings</span><strong>{healthResult.summary.warnings}</strong><small>Response needs review</small></article>
          <article><span>Failed</span><strong>{healthResult.summary.failed}</strong><small>Request or server error</small></article>
        </div>
        <div className="ai-feature-list">{(healthResult.results||[]).map((item:AnyObj)=><div className="ai-feature-row" key={item.id}><span className="ai-feature-mark">{item.status==="PASS"?"✓":item.status==="WARN"?"!":"×"}</span><div className="ai-feature-main"><strong>{item.label}</strong><small>{item.path} · HTTP {item.httpStatus??"no response"} · {item.latencyMs} ms</small><small>{item.message}</small></div><span className={"ai-pill "+(item.status==="PASS"?"good":item.status==="WARN"?"muted":"bad")}>{item.status}</span></div>)}</div>
        </>}
        {!healthResult&&<div className="ai-empty">No health check has been run in this session yet. Start a check to inspect live endpoint responses.</div>}
        <div className="ai-panel-heading" style={{marginTop:24}}><div><h2>Recent health check history</h2><p>Saved locally in this browser, up to 20 reports. This history is not yet shared across devices.</p></div></div>
        {healthHistory.length===0?<div className="ai-empty">No saved health reports yet.</div>:<div className="ai-table-wrap"><table><thead><tr><th>Checked at</th><th>Status</th><th>Passed</th><th>Warnings</th><th>Failed</th><th>Details</th></tr></thead><tbody>{healthHistory.map((entry:AnyObj,i:number)=><tr key={entry.checkedAt||i}><td>{entry.checkedAt?new Date(entry.checkedAt).toLocaleString():"—"}</td><td><span className={"ai-pill "+(entry.summary?.status==="PASS"?"good":entry.summary?.status==="WARN"?"muted":"bad")}>{entry.summary?.status||"—"}</span></td><td>{entry.summary?.passed??0}</td><td>{entry.summary?.warnings??0}</td><td>{entry.summary?.failed??0}</td><td><button onClick={()=>setHealthResult(entry)}>View report</button></td></tr>)}</tbody></table></div>}
        <div className="ai-panel-heading" style={{marginTop:24}}><div><h2>Improvement & issue queue</h2><p>Warnings and failures from health checks are tracked here. Mark work in progress only when someone has started investigating; resolve after rechecking the affected endpoint.</p></div><select value={issueFilter} onChange={e=>setIssueFilter(e.target.value)}><option value="OPEN">Open issues</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option><option value="ALL">All issues</option></select></div>
        {maintenanceIssues.filter(issue=>issueFilter==="ALL"||issue.status===issueFilter).length===0?<div className="ai-empty">No issues in this view. Run a health check to discover current warnings or failures.</div>:<div className="ai-drafts">{maintenanceIssues.filter(issue=>issueFilter==="ALL"||issue.status===issueFilter).map((issue:AnyObj)=><article className="ai-draft" key={issue.id+issue.firstSeen}><div className="ai-draft-top"><div><span className="ai-kicker">{issue.severity} PRIORITY · {issue.endpoint}</span><h3>{issue.title}</h3><p>{issue.message}</p><small>First detected {issue.firstSeen?new Date(issue.firstSeen).toLocaleString():"—"} · Last detected {issue.lastSeen?new Date(issue.lastSeen).toLocaleString():"—"}</small></div><span className={"ai-pill "+(issue.status==="RESOLVED"?"good":issue.status==="IN_PROGRESS"?"muted":"bad")}>{issue.status.replace("_"," ")}</span></div><div className="ai-draft-actions">{issue.status!=="IN_PROGRESS"&&issue.status!=="RESOLVED"&&<button onClick={()=>updateMaintenanceIssue(issue.id,"IN_PROGRESS")}>Start investigation</button>}{issue.status!=="RESOLVED"&&<button onClick={()=>updateMaintenanceIssue(issue.id,"RESOLVED")}>Mark resolved</button>}{issue.status==="RESOLVED"&&<button onClick={()=>updateMaintenanceIssue(issue.id,"OPEN")}>Reopen</button>}<button onClick={()=>void runWebsiteHealth()} disabled={healthRunning}>Recheck website</button></div></article>)}</div>}
        <p className="ai-footnote">Automated daily audit: GitHub Actions checks the production storefront and core APIs at 08:00 Bangladesh time. Failed checks create or update a GitHub issue. This dashboard's report and issue history are browser-local; cross-device history and automatic code repair/deployment are not enabled yet.</p>
      </section>}
      {tab==="chat-history" && <section className="ai-panel">
        <div className="ai-panel-heading"><div><h2>Customer chat history</h2><p>Recent MART Assistant conversations. Email addresses, phone-like numbers and common secret patterns are redacted before storage.</p></div><button onClick={()=>void loadConversations()} disabled={conversationLoading}>{conversationLoading?"Loading…":"Refresh history"}</button></div>
        {conversations.length===0?<div className="ai-empty">{conversationLoading?"Loading conversations…":"No server-side conversations loaded yet. Refresh to check for recent customer chats."}</div>:<div className="ai-two-col">
          <div className="ai-feature-list">{conversations.map((conversation:AnyObj)=><button key={conversation.id} type="button" onClick={()=>setSelectedConversation(conversation.id)} style={{display:"block",textAlign:"left",width:"100%",padding:14,marginBottom:8,border:conversation.id===selectedConversation?"1px solid var(--accent)":"1px solid var(--line)",background:conversation.id===selectedConversation?"#fff7ed":"#fff",borderRadius:12}}><strong>{conversation.messages?.find((m:AnyObj)=>m.role==="user")?.text?.slice(0,80)||"Conversation"}</strong><small style={{display:"block",marginTop:5}}>{conversation.messages?.length||0} messages · Updated {conversation.updatedAt?new Date(conversation.updatedAt).toLocaleString():"—"}</small></button>)}</div>
          <div className="ai-panel" style={{background:"#f8fafc",maxHeight:620,overflowY:"auto"}}><h3>Conversation transcript</h3>{(conversations.find((item:AnyObj)=>item.id===selectedConversation)?.messages||[]).map((message:AnyObj,index:number)=><div key={index} style={{padding:12,margin:"10px 0",borderRadius:12,background:message.role==="user"?"#fff0e6":"#fff",border:"1px solid var(--line)"}}><small style={{fontWeight:700}}>{message.role==="user"?"Customer":"MART Assistant"} · {message.createdAt?new Date(message.createdAt).toLocaleString():""}</small><p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",marginBottom:0}}>{message.text}</p></div>)}</div>
        </div>}
        <p className="ai-footnote">Access is limited to managers and super admins. Conversation history is stored in Firestore and contains redacted text; avoid requesting sensitive personal, OTP, password or payment information in chat.</p>
      </section>}
      {tab==="features" && <div className="ai-two-col">
        <section className="ai-panel"><h2>Feature controls</h2><p>Switch features on or off independently. Changes apply after saving.</p>
          <label className="ai-toggle-row"><span><strong>Global AI switch</strong><small>Pause all Gemini features without disabling checkout or other store functions.</small></span><input type="checkbox" checked={settings.enabled!==false} onChange={e=>setSettings((s:AnyObj)=>({...s,enabled:e.target.checked}))}/></label>
          {FEATURES.map(f=><label className="ai-toggle-row" key={f.id}><span><strong>{f.title}</strong><small>{f.desc}</small><small className="ai-muted">{(featureStats.get(f.id) as AnyObj)?.total??0} requests logged in 7 days</small></span><input type="checkbox" checked={settings.features?.[f.id]!==false} disabled={settings.enabled===false} onChange={e=>setFeature(f.id,e.target.checked)}/></label>)}
          <button className="ai-primary" onClick={()=>void save()} disabled={saving}>{saving?"Saving…":"Save feature controls"}</button>
        </section>
        <section className="ai-panel"><h2>Try an AI feature</h2><p>Use this panel to test live feature behavior. Admin-only tools require the correct role.</p>
          <label>Feature<select value={selected} onChange={e=>{setSelected(e.target.value);setGenerated(null)}}>{FEATURES.map(f=><option key={f.id} value={f.id}>{f.title}</option>)}</select></label>
          {["product-description","marketing-studio","creative-studio"].includes(selected)&&<><label>Product name (if not selecting by ID)<input value={productName} onChange={e=>setProductName(e.target.value)} placeholder="e.g. Cotton T-shirt"/></label><label>Choose existing product (optional)<select value={productId} onChange={e=>{setProductId(e.target.value);const p=products.find(x=>x.id===e.target.value);if(p)setProductName(p.name||"");}}><option value="">Use product name / general brief</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} · {p.sku||p.id}</option>)}</select></label></>}
          <label>Prompt / product notes<textarea rows={4} value={input} onChange={e=>setInput(e.target.value)} placeholder="Describe what you need. Avoid entering customer or payment secrets."/></label>
          <div className="ai-form-grid"><label>Language<select value={language} onChange={e=>setLanguage(e.target.value)}><option>Bangla and English</option><option>Bangla</option><option>English</option></select></label><label>Tone<select value={tone} onChange={e=>setTone(e.target.value)}><option value="professional">Professional</option><option value="friendly">Friendly</option><option value="premium">Premium</option><option value="concise">Concise</option></select></label></div>
          {selected==="sales-analyst"&&<label>Report period<select value={dateRange} onChange={e=>setDateRange(e.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>}
          <button className="ai-primary" onClick={()=>void runFeature()} disabled={generating||settings.enabled===false||settings.features?.[selected]===false}>{generating?"Generating…":"Run "+featureName(selected)}</button>
          {generated&&<div className="ai-result"><div className="ai-result-meta"><strong>Generated response</strong><span>{generated.model} · {generated.latencyMs} ms</span></div><pre>{generated.text}</pre>{generated.draft&&<small>Saved draft: {generated.draft.title} · {generated.draft.status}</small>}{Array.isArray(generated.products)&&generated.products.length>0&&<div className="ai-product-results"><strong>Catalog matches</strong>{generated.products.map((p:AnyObj)=><div key={p.id}><span>{p.name}</span><b>৳{Number(p.price||0).toLocaleString("en-BD")}</b><small>{p.category||"Uncategorized"} · Stock {p.stock}</small></div>)}</div>}</div>}
        </section>
      </div>}
      {tab==="content" && <section className="ai-panel"><div className="ai-panel-heading"><div><h2>AI content library</h2><p>AI-generated content stays as a draft. Approval here does not publish content.</p></div><span className="ai-pill muted">{(data?.drafts||[]).length} recent drafts</span></div>
        <div className="ai-drafts">{(data?.drafts||[]).length===0?<div className="ai-empty">No AI drafts have been generated yet.</div>:(data?.drafts||[]).map((d:AnyObj)=><article className="ai-draft" key={d.id}><div className="ai-draft-top"><div><span className="ai-kicker">{featureName(d.feature)}</span><h3>{d.title}</h3><small>{d.createdAt?new Date(d.createdAt).toLocaleString():"Date unavailable"} · by {d.createdBy||"unknown"}</small></div><span className={"ai-pill "+(d.status==="APPROVED"?"good":d.status==="REJECTED"?"bad":"muted")}>{d.status}</span></div><details><summary>Preview draft</summary><pre>{d.content}</pre></details>{["PENDING","APPROVED"].includes(d.status)&&<div className="ai-draft-actions"><button disabled={actionDraft===d.id} onClick={()=>void reviewDraft(d.id,"APPROVED")}>Approve draft</button><button disabled={actionDraft===d.id} onClick={()=>void reviewDraft(d.id,"REJECTED")}>Reject</button><button disabled={actionDraft===d.id} onClick={()=>void reviewDraft(d.id,"ARCHIVED")}>Archive</button></div>}</article>)}</div>
      </section>}
      {tab==="logs" && <section className="ai-panel"><div className="ai-panel-heading"><div><h2>Usage & operational logs</h2><p>Recent sanitized request metadata; raw prompts and API keys are not displayed.</p></div><button onClick={()=>void load()}>Refresh</button></div>
        <div className="ai-table-wrap"><table><thead><tr><th>Time</th><th>Feature</th><th>Model</th><th>Status</th><th>Latency</th><th>Tokens</th><th>Error</th></tr></thead><tbody>{(data?.logs||[]).map((l:AnyObj)=><tr key={l.id}><td>{l.createdAt?new Date(l.createdAt).toLocaleString():"—"}</td><td>{featureName(l.feature)}</td><td>{l.model||"—"}</td><td><span className={"ai-pill "+(l.status==="SUCCESS"?"good":l.status==="FALLBACK"?"muted":"bad")}>{l.status}</span></td><td>{Number(l.latencyMs||0)} ms</td><td>{Number(l.inputTokens||0)+Number(l.outputTokens||0)>0?Number(l.inputTokens||0)+" / "+Number(l.outputTokens||0):"—"}</td><td>{l.errorCode||"—"}</td></tr>)}</tbody></table>{!(data?.logs||[]).length&&<div className="ai-empty">No request logs recorded yet.</div>}</div>
        <p className="ai-footnote">Per-request token values are collected in aggregate metrics; the table intentionally avoids customer prompts and content. Google provider quota is not available from this endpoint.</p>
      </section>}
      {tab==="settings" && <div className="ai-two-col"><section className="ai-panel"><h2>Gemini configuration</h2><p>The API key is never shown or saved in the settings database. Configure it as a Cloudflare Worker encrypted secret named <code>GEMINI_API_KEY</code>.</p>
        <label>Gemini model<select value={settings.model||"gemini-3.5-flash-lite"} onChange={e=>setSettings((s:AnyObj)=>({...s,model:e.target.value}))}><option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite · default</option><option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite</option><option value="gemini-3.8-flash">Gemini 3.8 Flash</option></select></label>
        <small>Model availability and free quota depend on your Google AI Studio project. Check provider limits before production use.</small>
        <div className="ai-form-grid"><label>Daily app-side cap (best-effort)<input type="number" min={1} max={5000} value={settings.dailyRequestLimit} onChange={e=>setSettings((s:AnyObj)=>({...s,dailyRequestLimit:Number(e.target.value)}))}/></label><label>Max output tokens<input type="number" min={128} max={4096} value={settings.maxOutputTokens} onChange={e=>setSettings((s:AnyObj)=>({...s,maxOutputTokens:Number(e.target.value)}))}/></label></div>
        <label className="ai-toggle-row"><span><strong>Enable all AI features</strong><small>Turning this off pauses AI endpoints only. Core store functions remain available.</small></span><input type="checkbox" checked={settings.enabled!==false} onChange={e=>setSettings((s:AnyObj)=>({...s,enabled:e.target.checked}))}/></label>
        <div className="ai-actions"><button className="ai-primary" onClick={()=>void save()} disabled={saving}>{saving?"Saving…":"Save configuration"}</button><button onClick={()=>void testConnection()} disabled={testing}>{testing?"Testing…":"Test API connection"}</button></div>
      </section><section className="ai-panel"><h2>Security & quota safeguards</h2><ul className="ai-safety-list"><li>Keep <code>GEMINI_API_KEY</code> in Cloudflare encrypted Worker secrets, never in browser code or git.</li><li>Google AI Studio Free-tier prompts may be used to improve Google products. Review Google's current data terms before production and never send sensitive customer data.</li><li>Requests have input limits, timeouts, role checks for admin features, and per-isolate rate limiting.</li><li>Sales analysis uses server-computed aggregates and excludes customer identities.</li><li>AI cannot confirm payments, change orders, issue refunds, or update stock.</li><li>Generated descriptions, campaigns and reports require human review; approval does not publish them.</li><li>Quota exhaustion fails safely; the app does not switch to paid billing automatically.</li></ul><p className="ai-footnote">Free-tier request limits vary by model, project and current Google policy. Check the AI Studio quota dashboard for the authoritative provider limit.</p></section></div>}
    </>}
    <p className="ai-footnote">AI Studio metrics reflect stored telemetry only. A missing value is shown as “—”; it is not estimated or fabricated. Verify Cloudflare secrets and run a staging smoke test before production use.</p>
  </main></div>;
}
