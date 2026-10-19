"use client";

import AdminSidebar from "@/components/AdminSidebar";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type Gateway = {
  id: string; name: string; type: string; mode: string; enabled: boolean;
  apiBaseUrl?: string | null; qrImageUrl?: string | null; qrMerchantName?: string | null;
  publicConfig?: Record<string, unknown>;
};
const types = ["SSLCOMMERZ", "BKASH", "NAGAD", "ROCKET", "BANGLA_QR", "CUSTOM"];
const initialForm = { name: "", type: "SSLCOMMERZ", mode: "SANDBOX", apiBaseUrl: "", qrImageUrl: "", qrMerchantName: "", merchantNumber: "", storeId: "", storePassword: "" };
const moneyLabel = (s: string) => s.replaceAll("_", " ");
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
        publicConfig: ["BKASH", "NAGAD", "ROCKET"].includes(form.type) ? { merchantNumber: form.merchantNumber.trim() } : {},
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
  async function edit(g: Gateway) {
    const name = window.prompt("Payment method name", g.name); if (name === null || !name.trim()) return;
    const apiBaseUrl = window.prompt("API base URL (optional)", g.apiBaseUrl || ""); if (apiBaseUrl === null) return;
    const body: Record<string, unknown> = { name: name.trim(), apiBaseUrl: apiBaseUrl || null };
    if (g.type === "BANGLA_QR") {
      const qrImageUrl = window.prompt("Bangla QR image URL", g.qrImageUrl || ""); if (qrImageUrl === null) return;
      const qrMerchantName = window.prompt("QR merchant name", g.qrMerchantName || ""); if (qrMerchantName === null) return;
      Object.assign(body, { qrImageUrl: qrImageUrl || null, qrMerchantName: qrMerchantName || null });
    } else if (["BKASH", "NAGAD", "ROCKET"].includes(g.type)) {
      const merchantNumber = window.prompt("Merchant / payment number", String(g.publicConfig?.merchantNumber || "")); if (merchantNumber === null) return;
      body.publicConfig = { ...(g.publicConfig || {}), merchantNumber: merchantNumber.trim() };
    }
    await patch(g, body);
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
        {["BKASH", "NAGAD", "ROCKET"].includes(form.type) && <label>Merchant / payment number<input placeholder="01XXXXXXXXX" value={form.merchantNumber} onChange={e => set("merchantNumber", e.target.value)} /></label>}
        {form.type === "SSLCOMMERZ" && <><label>Store ID<input required value={form.storeId} onChange={e => set("storeId", e.target.value)} /></label><label>Store password<input type="password" required autoComplete="new-password" value={form.storePassword} onChange={e => set("storePassword", e.target.value)} /></label></>}
        {form.type === "BANGLA_QR" && <><label>Bangla QR image URL<input type="url" placeholder="https://…" value={form.qrImageUrl} onChange={e => set("qrImageUrl", e.target.value)} /></label><label>Merchant name<input value={form.qrMerchantName} onChange={e => set("qrMerchantName", e.target.value)} /></label></>}
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
          <div className="admin-module-top"><span className="admin-module-icon">{g.type === "BKASH" ? "bK" : g.type === "NAGAD" ? "N" : g.type === "ROCKET" ? "R" : g.type === "BANGLA_QR" ? "QR" : "৳"}</span><span className="admin-module-tag">{g.enabled ? "Enabled" : "Disabled"}</span></div>
          <h3>{g.name}</h3><p>{moneyLabel(g.type)} · {g.mode === "LIVE" ? "Live production" : "Sandbox / test"}</p>
          {g.publicConfig?.merchantNumber && <p>Merchant: {String(g.publicConfig.merchantNumber)}</p>}
          {g.apiBaseUrl && <p style={{ overflowWrap: "anywhere" }}>API: {g.apiBaseUrl}</p>}
          {g.type === "BANGLA_QR" && g.qrImageUrl && <img src={g.qrImageUrl} alt="Bangla QR payment code" loading="lazy" style={{ width: 180, maxWidth: "100%", borderRadius: 12, margin: "8px 0" }} />}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto", paddingTop: 12 }}>
            <button type="button" onClick={() => void edit(g)}>Edit</button>
            <button type="button" onClick={() => void patch(g, { enabled: !g.enabled })}>{g.enabled ? "Disable" : "Enable"}</button>
            <button type="button" onClick={() => void remove(g)}>Delete</button>
          </div>
          {g.enabled && g.mode === "LIVE" && <small style={{ color: "#b45309" }}>Check provider credentials and callback verification before accepting live payments.</small>}
        </article>)}</div>}
    </section>
    <p className="admin-footnote">Security: API secrets are not displayed in this page. Keep provider credentials and Telegram tokens in encrypted server-side storage / deployment secrets. A gateway being enabled here does not itself guarantee a provider integration is fully configured or verified.</p>
  </main></div>;
}
