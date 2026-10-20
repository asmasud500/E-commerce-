"use client";

import AdminSidebar from "@/components/AdminSidebar";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { fileToCompressedDataUrl } from "@/lib/client-image";

type Gateway = {
  id: string; name: string; type: string; mode: string; enabled: boolean;
  apiBaseUrl?: string | null; qrImageUrl?: string | null; qrMerchantName?: string | null;
  publicConfig?: Record<string, unknown>;
};
const types = ["SSLCOMMERZ", "BKASH", "NAGAD", "ROCKET", "BANGLA_QR", "CUSTOM"];
const initialForm = { name: "", type: "SSLCOMMERZ", mode: "SANDBOX", apiBaseUrl: "", qrImageUrl: "", qrMerchantName: "", merchantNumber: "", instructions: "", cod: false, storeId: "", storePassword: "" };
const MANUAL_TYPES = ["BKASH", "NAGAD", "ROCKET", "BANGLA_QR", "CUSTOM"];
const moneyLabel = (s: string) => s.replaceAll("_", " ");
const gatewayLogoDomain: Record<string, string> = {
  SSLCOMMERZ: "sslcommerz.com",
  BKASH: "bkash.com",
  NAGAD: "nagad.com.bd",
  ROCKET: "dutchbanglabank.com",
  BANGLA_QR: "bb.org.bd",
};
const gatewayLogoUrl = (type: string) => gatewayLogoDomain[type]
  ? `https://www.google.com/s2/favicons?domain=${gatewayLogoDomain[type]}&sz=128`
  : "";

export default function PaymentGateways() {
  const [items, setItems] = useState<Gateway[]>([]);
  const [form, setForm] = useState(initialForm);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qrUploadBusy, setQrUploadBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/admin/payment-gateways", { cache: "no-store" });
      const data = await r.json();
      if (!r.ok || !Array.isArray(data)) throw new Error(data.error || "Could not load payment methods.");
      setItems(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load payment methods."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => items.filter(g =>
    (filter === "ALL" || (filter === "ENABLED" ? g.enabled : !g.enabled)) &&
    [g.name, g.type, g.mode].some(v => v.toLowerCase().includes(query.trim().toLowerCase()))
  ), [items, filter, query]);
  const set = (key: keyof typeof initialForm, value: string) => setForm(old => ({ ...old, [key]: value }));

  async function add(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(""); setError("");
    const secrets = form.type === "SSLCOMMERZ" ? { storeId: form.storeId, storePassword: form.storePassword } : undefined;
    try {
      const r = await fetch("/api/admin/payment-gateways", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        name: form.name.trim(), type: form.type, mode: form.mode, apiBaseUrl: form.apiBaseUrl || undefined,
        qrImageUrl: form.qrImageUrl || undefined, qrMerchantName: form.qrMerchantName || undefined,
        publicConfig: MANUAL_TYPES.includes(form.type) ? { merchantNumber: form.merchantNumber.trim(), instructions: form.instructions.trim(), ...(form.type === "CUSTOM" && form.cod ? { cod: true } : {}) } : {},
        enabled: false, sortOrder: items.length, secrets
      }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not add payment method.");
      setMsg("Payment method added and kept disabled until you enable it.");
      setForm(initialForm); setShowForm(false); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add payment method."); }
    finally { setBusy(false); }
  }
  async function patch(g: Gateway, body: Record<string, unknown>) {
    setError(""); setMsg("");
    try {
      const r = await fetch("/api/admin/payment-gateways/" + encodeURIComponent(g.id), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Update failed.");
      setMsg("Payment method updated."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Update failed."); }
  }
  async function uploadQrImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Choose an image file."); return; }
    setQrUploadBusy(true); setError(""); setMsg("");
    try {
      const dataUrl = await fileToCompressedDataUrl(file, 500_000);
      const r = await fetch("/api/admin/image-upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl }) });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error(d.error || "QR image upload failed.");
      set("qrImageUrl", d.url); setMsg("QR image uploaded. Save the payment method to keep the change.");
    } catch (e) { setError(e instanceof Error ? e.message : "QR image upload failed."); }
    finally { setQrUploadBusy(false); }
  }
  async function chooseQrImageForEdit(): Promise<string | null> {
    return new Promise(resolve => {
      const input = document.createElement("input"); input.type = "file"; input.accept = "image/jpeg,image/png,image/webp";
      input.onchange = async () => {
        const file = input.files?.[0]; if (!file) { resolve(null); return; }
        try {
          const dataUrl = await fileToCompressedDataUrl(file, 500_000);
          const r = await fetch("/api/admin/image-upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl }) });
          const d = await r.json(); if (!r.ok || !d.url) throw new Error(d.error || "QR image upload failed.");
          resolve(d.url);
        } catch (e) { setError(e instanceof Error ? e.message : "QR image upload failed."); resolve(null); }
      };
      input.click();
    });
  }

  async function edit(g: Gateway) {
    const name = window.prompt("Payment method name", g.name); if (name === null || !name.trim()) return;
    const apiBaseUrl = window.prompt("API base URL (optional)", g.apiBaseUrl || ""); if (apiBaseUrl === null) return;
    const body: Record<string, unknown> = { name: name.trim(), apiBaseUrl: apiBaseUrl || null };
    if (g.type === "BANGLA_QR") {
      let qrImageUrl: string | null = g.qrImageUrl || "";
      if (window.confirm("Upload a QR image directly from your phone/computer? Choose Cancel to enter an image URL instead.")) {
        const uploaded = await chooseQrImageForEdit(); if (!uploaded) return; qrImageUrl = uploaded;
      } else {
        const entered = window.prompt("Bangla QR image URL (or /api/img/...)", g.qrImageUrl || ""); if (entered === null) return; qrImageUrl = entered;
      }
      const qrMerchantName = window.prompt("QR merchant name", g.qrMerchantName || ""); if (qrMerchantName === null) return;
      Object.assign(body, { qrImageUrl: qrImageUrl || null, qrMerchantName: qrMerchantName || null });
    }
    await patch(g, body);
  }
  const [payEdit, setPayEdit] = useState<{ id: string; number: string; instructions: string } | null>(null);
  function openPayEdit(g: Gateway) { setPayEdit({ id: g.id, number: String(g.publicConfig?.merchantNumber || ""), instructions: String(g.publicConfig?.instructions || "") }); }
  async function savePayEdit(g: Gateway) {
    if (!payEdit) return;
    await patch(g, { publicConfig: { ...(g.publicConfig || {}), merchantNumber: payEdit.number.trim(), instructions: payEdit.instructions.trim() } });
    setPayEdit(null);
  }
  async function remove(g: Gateway) {
    if (!window.confirm("Delete " + g.name + "? This cannot be undone.")) return;
    setError("");
    try {
      const r = await fetch("/api/admin/payment-gateways/" + encodeURIComponent(g.id), { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Delete failed.");
      setMsg("Payment method deleted."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Delete failed."); }
  }
  function exportCsv() {
    const rows = [["Name", "Type", "Mode", "Enabled", "Merchant number", "API base URL"], ...filtered.map(g => [
      g.name, g.type, g.mode, g.enabled ? "Yes" : "No", String(g.publicConfig?.merchantNumber || ""), g.apiBaseUrl || ""
    ])];
    const csv = "\uFEFF" + rows.map(row => row.map(v => '"' + String(v ?? "").replaceAll('"', '""') + '"').join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "payment-methods.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return <div className="admin-layout"><AdminSidebar /><main className="admin-content" style={{ maxWidth: 1440, width: "100%", margin: "0 auto", padding: "clamp(16px, 3vw, 32px)" }}>
    <a href="/admin" style={{ color: "var(--admin-muted, #64748b)", textDecoration: "none" }}>← Admin dashboard</a>
    <div className="admin-heading-row" style={{ marginTop: 16, alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <div><div className="admin-kicker">PAYMENTS · CONFIGURATION</div><h1>Payment methods</h1><p>Manage checkout payment options, merchant details and sandbox/live modes.</p></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" onClick={exportCsv} disabled={!filtered.length}>Export CSV</button><button type="button" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button><button className="admin-primary-action" type="button" onClick={() => setShowForm(v => !v)}>{showForm ? "Close form" : "+ Add payment method"}</button></div>
    </div>
    <div className="admin-stat-grid" style={{ marginTop: 22 }}>
      {[["Total methods", items.length, "Configured payment options"], ["Enabled", items.filter(g => g.enabled).length, "Available for checkout"], ["Disabled", items.filter(g => !g.enabled).length, "Not shown as active"], ["Live mode", items.filter(g => g.enabled && g.mode === "LIVE").length, "Enabled live configurations"]].map(([label, value, note]) =>
        <article className="admin-stat" key={String(label)}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}
    </div>
    {msg && <p role="status" className="admin-notice">{msg}</p>}
    {error && <p role="alert" className="admin-notice" style={{ borderColor: "#dc2626" }}>{error}</p>}
    {showForm && <section className="admin-recent" style={{ marginTop: 20 }}><div className="admin-section-heading"><div><h2>Add payment method</h2><p>New methods are created disabled to prevent accidental use before testing.</p></div></div>
      <form onSubmit={add} className="admin-resource-form">
        <label>Display name<input required minLength={2} placeholder="e.g. bKash Personal" value={form.name} onChange={e => set("name", e.target.value)} /></label>
        <label>Provider<select value={form.type} onChange={e => set("type", e.target.value)}>{types.map(x => <option key={x} value={x}>{moneyLabel(x)}</option>)}</select></label>
        <label>Environment<select value={form.mode} onChange={e => set("mode", e.target.value)}><option value="SANDBOX">Sandbox / Test</option><option value="LIVE">Live / Production</option></select></label>
        <label>API base URL (optional)<input type="url" placeholder="https://…" value={form.apiBaseUrl} onChange={e => set("apiBaseUrl", e.target.value)} /></label>
        {form.type === "CUSTOM" && <label style={{ gridColumn: "1 / -1" }}><input type="checkbox" checked={form.cod} onChange={e => setForm({ ...form, cod: e.target.checked })} /> This is Cash on Delivery (no online payment; you confirm the order and mark cash collected after delivery)</label>}
        {MANUAL_TYPES.includes(form.type) && <><label>Number customers send money to<input placeholder="01XXXXXXXXX" value={form.merchantNumber} onChange={e => set("merchantNumber", e.target.value)} /></label>
        <label style={{ gridColumn: "1 / -1" }}>Payment instructions shown to the customer<textarea rows={5} placeholder={"Example:\nSend {amount} by bKash Send Money to {number}.\nUse {order} as the reference, then submit the transaction ID."} value={form.instructions} onChange={e => set("instructions", e.target.value)} /><small>{"You can use {amount}, {order} and {number}; they are filled in for each order."}</small></label></>}
        {form.type === "SSLCOMMERZ" && <><label>Store ID<input required value={form.storeId} onChange={e => set("storeId", e.target.value)} /></label><label>Store password<input type="password" required autoComplete="new-password" value={form.storePassword} onChange={e => set("storePassword", e.target.value)} /></label></>}
        {form.type === "BANGLA_QR" && <><label>Bangla QR image URL<input type="text" placeholder="https://… or uploaded image" value={form.qrImageUrl} onChange={e => set("qrImageUrl", e.target.value)} /></label><label style={{ display: "grid", gap: 7 }}>Or upload QR image directly<input type="file" accept="image/jpeg,image/png,image/webp" disabled={qrUploadBusy} onChange={e => { void uploadQrImage(e.target.files?.[0]); e.currentTarget.value = ""; }} /><small>{qrUploadBusy ? "Uploading and compressing…" : "JPG, PNG or WebP · compressed automatically"}</small></label>{form.qrImageUrl && <img src={form.qrImageUrl} alt="QR image preview" style={{ width: 150, maxWidth: "100%", borderRadius: 10, objectFit: "contain" }} />}<label>Merchant name<input value={form.qrMerchantName} onChange={e => set("qrMerchantName", e.target.value)} /></label></>}
        <button className="admin-primary-action" type="submit" disabled={busy}>{busy ? "Saving…" : "Save payment method"}</button>
      </form>
    </section>}
    <section className="admin-recent" style={{ marginTop: 20 }}>
      <div className="admin-section-heading"><div><h2>Configured methods</h2><p>{filtered.length} of {items.length} methods</p></div></div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "14px 0" }}>
        <input aria-label="Search payment methods" placeholder="Search name, provider or mode…" value={query} onChange={e => setQuery(e.target.value)} style={{ flex: "1 1 240px", minWidth: 0 }} />
        <select aria-label="Filter payment methods" value={filter} onChange={e => setFilter(e.target.value)}><option value="ALL">All methods</option><option value="ENABLED">Enabled only</option><option value="DISABLED">Disabled only</option></select>
      </div>
      {loading ? <p className="admin-empty">Loading payment methods…</p> : filtered.length === 0 ? <p className="admin-empty">No payment methods match your search. Add a method or change the filter.</p> :
        <div className="admin-module-grid">{filtered.map(g => <article className="admin-module-card" key={g.id}>
          <div className="admin-module-top"><span className="admin-module-icon" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",overflow:"hidden",background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,width:54,height:54,padding:6}}>{gatewayLogoUrl(g.type) ? <img src={gatewayLogoUrl(g.type)} alt={moneyLabel(g.type)+" logo"} loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display="none";}} style={{width:"100%",height:"100%",objectFit:"contain"}} /> : <span aria-label="Payment provider icon">৳</span>}</span><span className="admin-module-tag">{g.enabled ? "Enabled" : "Disabled"}</span></div>
          <h3>{g.name}</h3><p>{moneyLabel(g.type)} · {g.mode === "LIVE" ? "Live production" : "Sandbox / test"}</p>
          {typeof g.publicConfig?.merchantNumber === "string" && g.publicConfig.merchantNumber.length > 0 && <p>Merchant: {g.publicConfig.merchantNumber}</p>}
          {typeof g.publicConfig?.instructions === "string" && g.publicConfig.instructions.length > 0 && <p style={{ whiteSpace: "pre-line", fontSize: 13 }}>Instructions: {g.publicConfig.instructions}</p>}
          {MANUAL_TYPES.includes(g.type) && payEdit?.id === g.id && <div style={{ display: "grid", gap: 8, margin: "8px 0" }}>
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Payment number<input value={payEdit.number} onChange={e => setPayEdit({ ...payEdit, number: e.target.value })} placeholder="01XXXXXXXXX" /></label>
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Instructions for customers<textarea rows={5} value={payEdit.instructions} onChange={e => setPayEdit({ ...payEdit, instructions: e.target.value })} placeholder={"Send {amount} to {number} and use {order} as the reference."} /></label>
            <small>{"Use {amount}, {order} and {number} as placeholders."}</small>
            <div style={{ display: "flex", gap: 8 }}><button type="button" onClick={() => void savePayEdit(g)}>Save instructions</button><button type="button" onClick={() => setPayEdit(null)}>Cancel</button></div>
          </div>}
          {g.apiBaseUrl && <p style={{ overflowWrap: "anywhere" }}>API: {g.apiBaseUrl}</p>}
          {g.type === "BANGLA_QR" && g.qrImageUrl && <img src={g.qrImageUrl} alt="Bangla QR payment code" loading="lazy" style={{ width: 180, maxWidth: "100%", borderRadius: 12, margin: "8px 0" }} />}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto", paddingTop: 12 }}>
            <button type="button" onClick={() => void edit(g)}>Edit</button>
            {MANUAL_TYPES.includes(g.type) && <button type="button" onClick={() => openPayEdit(g)}>Number &amp; instructions</button>}
            <button type="button" onClick={() => void patch(g, { enabled: !g.enabled })}>{g.enabled ? "Disable" : "Enable"}</button>
            <button type="button" onClick={() => void remove(g)}>Delete</button>
          </div>
          {g.enabled && g.mode === "LIVE" && <small style={{ color: "#b45309" }}>Check provider credentials and callback verification before accepting live payments.</small>}
        </article>)}</div>}
    </section>
    <p className="admin-footnote">Security: API secrets are not displayed in this page. Keep provider credentials and Telegram tokens in encrypted server-side storage / deployment secrets. A gateway being enabled here does not itself guarantee a provider integration is fully configured or verified.</p>
  </main></div>;
}
