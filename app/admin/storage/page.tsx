"use client";

import { useCallback, useEffect, useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";

type Asset = { id: string; filename: string; mime: string; size: number; backupStatus: string; updatedAt: string };
type Job = { id: string; filename: string; status: string; attempts: number; nextAttemptAt: string; lastError: string | null; updatedAt: string };
type Overview = { totalAssets: number; totalBytes: number; backupComplete: number; backupPending: number; backupFailed: number; legacyBase64Images: number; productImageRecords: number; reviewImageRecords: number; assets: Asset[]; jobs: Job[] };
const formatBytes = (n: number) => { if (!n) return "0 B"; const units = ["B", "KB", "MB", "GB", "TB"]; const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1); return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`; };
const features = [
  { title: "Provider health monitor", detail: "Actively probe Firestore, Telegram API and a recent Google Drive backup.", status: "Active", note: "Use Check providers; Drive can report degraded if no backup sample exists yet." },
  { title: "Automatic failover", detail: "Image delivery falls back to a verified Google Drive copy if Telegram is unavailable.", status: "Active", note: "Enabled for image API reads when a Drive file ID exists; originals are never deleted." },
  { title: "Image & file scanner", detail: "Inspect recent Telegram image records and their available Drive fallback.", status: "Partial", note: "The integrity scan is bounded to recent records to protect runtime limits." },
  { title: "Drive backup monitor", detail: "Track queued, completed and failed media backups.", status: "Active", note: "Uses the existing durable backup job queue and recorded Drive file IDs." },
  { title: "Performance analytics", detail: "Track latency, failure rate and cache efficiency over time.", status: "Needs metrics", note: "Historical time-series instrumentation is required before showing trustworthy charts." },
  { title: "Restore & recovery tests", detail: "Read sample Drive backups and validate stored checksums without overwriting production data.", status: "Active", note: "Use Verify backups to run a non-destructive sample restore verification." },
  { title: "Data integrity checker", detail: "Read sample Telegram images and compare SHA-256 checksums; flag missing backups.", status: "Active", note: "Use Run integrity scan. Scan is bounded to a configurable recent sample." },
  { title: "Smart alerts", detail: "Send Telegram alerts for degraded provider probes and failed integrity/restore checks.", status: "Partial", note: "Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID; duplicate alerts are suppressed for 30 minutes." },
  { title: "Retry queue manager", detail: "Inspect pending jobs and safely retry due backup work.", status: "Active", note: "The existing retry endpoint processes due jobs with bounded batches." },
  { title: "Cache & image optimization", detail: "Monitor cache behaviour and use appropriately sized image variants.", status: "Needs metrics", note: "Cache hit/miss and image transformation telemetry are not currently exposed here." },
  { title: "Audit log", detail: "Keep a searchable record of retries, recovery operations and settings changes.", status: "Partial", note: "Recent queue status is visible; a dedicated storage audit event stream is still needed." },
  { title: "Security & storage settings", detail: "Run operations through authenticated admin APIs while keeping credentials server-side.", status: "Partial", note: "Configure provider tokens as Cloudflare Worker secrets; never paste secret values into this page." },
];
const statusClass = (status: string) => status === "Active" ? "storage-pill storage-pill-good" : status === "Partial" ? "storage-pill storage-pill-warn" : "storage-pill";

export default function StorageAdminPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [operation, setOperation] = useState<{title:string;data:any}|null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/admin/storage", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Storage overview failed");
      setData(j);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load storage overview"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function retry() {
    setBusy(true); setError(""); setNotice("");
    try {
      const r = await fetch("/api/admin/storage", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Retry failed");
      setNotice(`Queue processed: ${j.succeeded} succeeded, ${j.failed} failed, ${j.skipped} not due.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to process backup queue"); }
    finally { setBusy(false); }
  }
  async function runStorageOperation(path: string, title: string) {
    setBusy(true); setError(""); setNotice("");
    try { const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ limit: 25 }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || title + " failed"); setOperation({ title, data: j }); setNotice(title + " completed."); }
    catch (e) { setError(e instanceof Error ? e.message : title + " failed"); }
    finally { setBusy(false); }
  }
  const stats = data ? [
    { label: "Registered assets", value: data.totalAssets.toLocaleString("en-BD"), note: "Latest tracked inventory" },
    { label: "Tracked storage", value: formatBytes(data.totalBytes), note: "Original asset bytes" },
    { label: "Backups complete", value: data.backupComplete.toLocaleString("en-BD"), note: "Recorded completed copies" },
    { label: "Backups pending", value: data.backupPending.toLocaleString("en-BD"), note: "Queued jobs" },
    { label: "Backup failures", value: data.backupFailed.toLocaleString("en-BD"), note: "Failed jobs" },
    { label: "Legacy Base64", value: data.legacyBase64Images.toLocaleString("en-BD"), note: "Review for safe migration" },
  ] : [];
  return <div className="admin-layout"><AdminSidebar /><main className="admin-content storage-health-page">
    <div className="admin-kicker">MART · SYSTEM HEALTH</div>
    <div className="admin-heading-row"><div><h1>Storage Health</h1><p>Media inventory, backup reliability, recovery readiness and storage operations.</p></div><div className="storage-actions"><button className="admin-secondary-action" onClick={() => void load()} disabled={loading}>↻ Refresh</button><button className="admin-primary-action" onClick={() => void retry()} disabled={busy}>{busy ? "Processing…" : "Retry due backups"}</button><button className="admin-secondary-action" onClick={() => void runStorageOperation("/api/admin/storage/health", "Provider health check")} disabled={busy}>Run Provider Health Check</button><button className="admin-secondary-action" onClick={() => void runStorageOperation("/api/admin/storage/integrity", "Integrity scan")} disabled={busy}>Run Integrity Scan</button><button className="admin-secondary-action" onClick={() => void runStorageOperation("/api/admin/storage/restore-test", "Backup restore test")} disabled={busy}>Test Backup Restore</button></div></div>
    {error && <div className="admin-alert" role="alert"><div><h2>Storage action needs attention</h2><p>{error}</p></div></div>}
    {notice && <div className="admin-alert" role="status"><div><h2>Storage operation</h2><p>{notice}</p></div></div>}
    {operation && <section className="admin-section-heading"><div><h2>{operation.title} results</h2><p>Latest server-side check result. Refresh or rerun an operation to update this report.</p><pre className="storage-result">{JSON.stringify(operation.data, null, 2)}</pre></div></section>}
    {loading && !data ? <p role="status">Loading storage metrics…</p> : data && <>
      <div className="admin-stat-grid">{stats.map(x => <article className="admin-stat" key={x.label}><span>{x.label}</span><strong>{x.value}</strong><small>{x.note}</small></article>)}</div>
      <section className="storage-provider-grid" aria-label="Storage provider overview">
        {[{name:"Firebase / app database",sub:"Metadata & asset records",icon:"DB",state:"Inventory connected"},{name:"Telegram media",sub:"Primary media source",icon:"TG",state:"Probe not configured"},{name:"Google Drive",sub:"Secondary media backup",icon:"GD",state:"Queue monitored"}].map(p => <article className="storage-provider-card" key={p.name}><div className="storage-provider-icon">{p.icon}</div><div className="storage-provider-copy"><h2>{p.name}</h2><p>{p.sub}</p><span>{p.state}</span></div></article>)}
      </section>
      <section className="admin-section-heading"><div><h2>Storage operations · 12 features</h2><p>Live capabilities are labelled separately from features that still need backend instrumentation or configuration.</p></div></section>
      <div className="storage-feature-grid">{features.map((f, i) => <article className="storage-feature-card" key={f.title}><div className="storage-feature-top"><span className="storage-feature-number">{String(i + 1).padStart(2, "0")}</span><span className={statusClass(f.status)}>{f.status}</span></div><h3>{f.title}</h3><p>{f.detail}</p><small>{f.note}</small></article>)}</div>
      <section className="admin-section-heading"><div><h2>Backup queue</h2><p>Retry attempts, next scheduled retry and sanitized error details.</p></div></section>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>File</th><th>Status</th><th>Attempts</th><th>Next retry</th><th>Last error</th></tr></thead><tbody>{data.jobs.length ? data.jobs.map(j => <tr key={j.id}><td>{j.filename || j.id}</td><td><span className="admin-status">{j.status}</span></td><td>{j.attempts || 0}</td><td>{j.nextAttemptAt ? new Date(j.nextAttemptAt).toLocaleString() : "—"}</td><td>{j.lastError || "—"}</td></tr>) : <tr><td colSpan={5}>No backup jobs found.</td></tr>}</tbody></table></div>
      <section className="admin-section-heading"><div><h2>Recent image assets</h2><p>Metadata and storage references; raw Base64 payloads are not displayed.</p></div></section>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>File</th><th>Type</th><th>Size</th><th>Backup</th><th>Last updated</th></tr></thead><tbody>{data.assets.length ? data.assets.map(a => <tr key={a.id}><td>{a.filename || a.id}</td><td>{a.mime || "—"}</td><td>{formatBytes(Number(a.size || 0))}</td><td><span className="admin-status">{a.backupStatus || "UNKNOWN"}</span></td><td>{a.updatedAt ? new Date(a.updatedAt).toLocaleString() : "—"}</td></tr>) : <tr><td colSpan={5}>No storage assets registered yet.</td></tr>}</tbody></table></div>
      <p className="storage-footnote">The inventory and verification jobs are deliberately bounded. Failover is read-only and checksum-verified; restore tests do not overwrite production files. Historical performance charts still require durable time-series telemetry.</p>
    </>}
  </main>
  <style jsx>{`
    .storage-result{max-width:100%;overflow:auto;white-space:pre-wrap;word-break:break-word;font-size:11px;padding:12px;border-radius:10px;background:var(--admin-surface,#fff);border:1px solid var(--admin-border,#e2e8f0)}.storage-health-page{min-width:0}.storage-actions{display:flex;gap:8px;flex-wrap:wrap}.storage-provider-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:20px 0 28px}.storage-provider-card{display:flex;align-items:flex-start;gap:12px;padding:17px;border:1px solid var(--admin-border,#e2e8f0);border-radius:14px;background:var(--admin-surface,#fff);min-width:0}.storage-provider-icon{display:grid;place-items:center;flex:0 0 42px;height:42px;border-radius:12px;background:#102344;color:#fff;font-weight:800;font-size:12px}.storage-provider-copy{min-width:0}.storage-provider-copy h2{font-size:14px;margin:0 0 5px;color:var(--admin-text,#102344)}.storage-provider-copy p,.storage-provider-copy span{font-size:12px;color:var(--admin-muted,#64748b);margin:0;display:block}.storage-provider-copy span{margin-top:8px;font-weight:650}.storage-feature-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:16px 0 28px}.storage-feature-card{border:1px solid var(--admin-border,#e2e8f0);border-radius:14px;padding:16px;background:var(--admin-surface,#fff);min-width:0}.storage-feature-top{display:flex;justify-content:space-between;align-items:center;gap:8px}.storage-feature-number{font-size:12px;font-weight:800;color:#ff6b00}.storage-pill{font-size:10px;font-weight:750;border-radius:999px;padding:5px 8px;background:#f1f5f9;color:#475569;white-space:nowrap}.storage-pill-good{background:#dcfce7;color:#166534}.storage-pill-warn{background:#fff7ed;color:#9a3412}.storage-feature-card h3{font-size:14px;margin:13px 0 7px;color:var(--admin-text,#102344)}.storage-feature-card p{font-size:12px;line-height:1.55;margin:0 0 10px;color:var(--admin-text,#334155)}.storage-feature-card small{display:block;font-size:11px;line-height:1.5;color:var(--admin-muted,#64748b)}.storage-footnote{font-size:12px;line-height:1.6;color:var(--admin-muted,#64748b);margin-top:18px}@media(max-width:1000px){.storage-provider-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.storage-feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.storage-provider-grid,.storage-feature-grid{grid-template-columns:minmax(0,1fr)}.storage-actions button{font-size:12px;padding:9px 11px}.storage-provider-card{padding:14px}.storage-feature-card{padding:14px}}
  `}</style>
</div>;
}
