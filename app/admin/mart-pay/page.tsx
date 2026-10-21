"use client";

import AdminSidebar from "@/components/AdminSidebar";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Gateway = {
  id: string; name: string; type: string; mode: string; enabled: boolean;
  credentialsConfigured?: boolean; apiBaseUrl?: string | null;
  publicConfig?: Record<string, unknown>; updatedAt?: string;
};

const moneyMethods = new Set(["SSLCOMMERZ", "BKASH", "NAGAD", "ROCKET", "UPAY", "BANGLA_QR", "CUSTOM"]);
const methodLabel: Record<string, string> = {
  SSLCOMMERZ: "SSLCOMMERZ", BKASH: "bKash", NAGAD: "Nagad",
  ROCKET: "Rocket", UPAY: "upay", BANGLA_QR: "Bangla QR", CUSTOM: "Custom / Demo",
};

export default function MartPayAdminPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/payment-gateways", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error(data.error || "Payment settings could not be loaded.");
      setGateways(data.filter((g: Gateway) => moneyMethods.has(g.type)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment settings could not be loaded.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggle(gateway: Gateway) {
    setBusyId(gateway.id); setNotice(""); setError("");
    try {
      const response = await fetch(`/api/admin/payment-gateways/${encodeURIComponent(gateway.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !gateway.enabled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update payment method.");
      setNotice(`${gateway.name}: ${!gateway.enabled ? "enabled" : "disabled"}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update payment method.");
    } finally { setBusyId(""); }
  }

  const enabledCount = gateways.filter(g => g.enabled).length;
  const liveCount = gateways.filter(g => g.enabled && g.mode === "LIVE").length;
  const configuredCount = gateways.filter(g => g.credentialsConfigured).length;

  return <div className="admin-shell"><AdminSidebar /><main className="admin-main">
    <div className="admin-page-header">
      <div><div className="admin-eyebrow">PAYMENTS CONTROL CENTER</div><h1>Mart Pay</h1>
        <p>Manage merchant checkout methods, gateway credentials, payment activity and demo checkout from one place.</p></div>
      <button className="admin-button" type="button" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "↻ Refresh"}</button>
    </div>

    <section className="admin-stat-grid" aria-label="Mart Pay overview">
      <article className="admin-stat-card"><span>Payment methods</span><strong>{gateways.length}</strong><small>Configured in this store</small></article>
      <article className="admin-stat-card"><span>Enabled methods</span><strong>{enabledCount}</strong><small>Available for checkout, subject to provider support</small></article>
      <article className="admin-stat-card"><span>Live enabled</span><strong>{liveCount}</strong><small>Live mode is not a payment-success guarantee</small></article>
      <article className="admin-stat-card"><span>Credential sets saved</span><strong>{configuredCount}</strong><small>Secrets remain server-side</small></article>
    </section>

    {notice && <div role="status" className="admin-alert admin-alert-success">{notice}</div>}
    {error && <div role="alert" className="admin-alert admin-alert-error">{error}</div>}

    <section className="admin-panel" style={{marginTop:24}}>
      <div className="admin-panel-heading"><div><h2>Merchant payment methods</h2><p>Enable or disable checkout methods. Configure API keys and provider endpoints in Payment Gateways.</p></div>
        <Link className="admin-button admin-button-primary" href="/admin/payment-gateways">Manage credentials & API ↗</Link></div>
      {loading ? <div className="admin-empty-state">Loading secure payment configuration…</div> :
        gateways.length === 0 ? <div className="admin-empty-state"><h3>No payment method configured yet</h3><p>Add your first merchant gateway, then return here to manage it.</p><Link className="admin-button admin-button-primary" href="/admin/payment-gateways">Add payment method</Link></div> :
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Method</th><th>Environment</th><th>Credentials</th><th>Status</th><th>Control</th></tr></thead>
          <tbody>{gateways.map(g => <tr key={g.id}>
            <td><strong>{methodLabel[g.type] || g.name}</strong><div className="admin-muted">{g.name}</div></td>
            <td><span className={g.mode === "LIVE" ? "admin-status-pill admin-status-warning" : "admin-status-pill"}>{g.mode === "LIVE" ? "LIVE" : "SANDBOX / DEMO"}</span></td>
            <td>{g.credentialsConfigured ? <span className="admin-status-pill admin-status-success">Saved securely</span> : <span className="admin-status-pill">Not confirmed</span>}</td>
            <td><span className={g.enabled ? "admin-status-pill admin-status-success" : "admin-status-pill"}>{g.enabled ? "Enabled" : "Disabled"}</span></td>
            <td><div className="admin-row-actions"><button type="button" className="admin-button" disabled={busyId === g.id} onClick={() => void toggle(g)}>{busyId === g.id ? "Saving…" : g.enabled ? "Disable" : "Enable"}</button><Link className="admin-button" href="/admin/payment-gateways">Configure</Link></div></td>
          </tr>)}</tbody>
        </table></div>}
    </section>

    <section className="admin-card-grid" style={{marginTop:24}}>
      <article className="admin-panel"><div className="admin-panel-heading"><h2>Gateway setup</h2></div><p>Set merchant credentials, sandbox/live mode, API base URL, callback/webhook endpoints, QR details and provider-specific configuration.</p><Link href="/admin/payment-gateways" className="admin-text-link">Open gateway settings →</Link></article>
      <article className="admin-panel"><div className="admin-panel-heading"><h2>Payment activity</h2></div><p>Review recorded payment transactions and investigate provider statuses. Successful payment must be verified server-side by the gateway.</p><Link href="/admin/payment-transactions" className="admin-text-link">View transactions →</Link></article>
      <article className="admin-panel"><div className="admin-panel-heading"><h2>Demo checkout</h2></div><p>Use the dedicated CUSTOM sandbox demo method for test orders. Demo confirmation must never be treated as a real-money payment.</p><Link href="/admin/payment-gateways" className="admin-text-link">Configure demo method →</Link></article>
    </section>
    <div className="admin-notice" style={{marginTop:20}}><strong>Security & automatic payments</strong><p>Only use merchant checkout integrations approved by the payment provider. Do not collect Send Money screenshots, transaction IDs or sender-number proofs here. API secrets are not displayed back in the browser; the server-side encryption key must remain in deployment secrets.</p></div>
  </main></div>;
}
