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
  ROCKET: "Rocket", UPAY: "upay", BANGLA_QR: "Bangla QR", CUSTOM: "Demo payment",
};
const methodIcon: Record<string, string> = { SSLCOMMERZ: "S", BKASH: "b", NAGAD: "N", ROCKET: "R", UPAY: "u", BANGLA_QR: "৳", CUSTOM: "✓" };

export default function MartPayAdminPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch("/api/admin/payment-gateways", { cache: "no-store", signal: controller.signal });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Payment settings could not be loaded.");
      if (!Array.isArray(data)) throw new Error("The payment settings response was invalid. Please refresh and try again.");
      setGateways(data.filter((g: Gateway) => g && typeof g.id === "string" && moneyMethods.has(g.type)));
    } catch (e) {
      setError(e instanceof Error && e.name === "AbortError" ? "Loading payment settings timed out. Check your connection and try again." : e instanceof Error ? e.message : "Payment settings could not be loaded.");
    } finally { clearTimeout(timer); setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggle(gateway: Gateway) {
    setBusyId(gateway.id); setNotice(""); setError("");
    try {
      const response = await fetch(`/api/admin/payment-gateways/${encodeURIComponent(gateway.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !gateway.enabled }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Could not update payment method.");
      setNotice(`${gateway.name}: ${!gateway.enabled ? "enabled" : "disabled"} successfully.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update payment method."); }
    finally { setBusyId(""); }
  }

  const enabledCount = gateways.filter(g => g.enabled).length;
  const liveCount = gateways.filter(g => g.enabled && g.mode === "LIVE").length;
  const configuredCount = gateways.filter(g => g.credentialsConfigured).length;
  const canActivate = (g: Gateway) => g.type === "SSLCOMMERZ"
    ? !!g.credentialsConfigured
    : g.type === "CUSTOM" && ((g.mode === "SANDBOX" && g.publicConfig?.demo === true) || g.publicConfig?.cod === true);

  return <div className="admin-shell martpay-shell">
    <style>{`
      /* Desktop-only layout fix: the old admin-shell wrapper had no two-column layout. Keep mobile styling untouched. */
      @media(min-width:761px){
        .martpay-shell{display:grid!important;grid-template-columns:250px minmax(0,1fr)!important;width:100%;height:100dvh;min-height:0;overflow:hidden;overscroll-behavior:none}
        .martpay-shell>.admin-sidebar{position:relative!important;inset:auto!important;width:auto;min-width:0;max-width:none;height:100dvh;min-height:0;max-height:100dvh;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain}
        .martpay-shell>main.admin-main{width:auto;min-width:0;height:100dvh;min-height:0;max-height:100dvh;overflow-x:hidden;overflow-y:auto;overscroll-behavior-y:contain;scrollbar-gutter:stable;-webkit-overflow-scrolling:touch}
      }
      .martpay-shell .admin-main{background:#f5f7fb;flex:1 1 0%;min-width:0;width:auto;max-width:none;box-sizing:border-box;overflow-x:clip;padding:clamp(18px,2.4vw,38px)!important}
      .martpay-content{width:100%;max-width:1680px;margin:0 auto;min-width:0}
      .martpay-content>*{min-width:0}
      .martpay-hero{position:relative;overflow:hidden;border-radius:24px;padding:clamp(24px,2.2vw,38px);background:linear-gradient(125deg,#111c32 0%,#172c4c 62%,#263e63 100%);color:white;display:flex;align-items:center;justify-content:space-between;gap:22px;box-shadow:0 16px 36px rgba(18,35,62,.16)}
      .martpay-hero:after{content:"";position:absolute;width:250px;height:250px;border:1px solid #ffffff20;border-radius:50%;right:13%;top:-155px;box-shadow:0 0 0 28px #ffffff08,0 0 0 58px #ffffff06;pointer-events:none}
      .martpay-kicker{font-size:11px;letter-spacing:2px;font-weight:800;color:#ff9b55;text-transform:uppercase;margin-bottom:10px}
      .martpay-hero h1{font-size:clamp(26px,3vw,36px);font-weight:850;letter-spacing:-1.2px;margin:0 0 8px}
      .martpay-hero p{color:#c4d0e0;max-width:600px;margin:0;line-height:1.65;font-size:14px}
      .martpay-hero-actions{display:flex;gap:10px;flex-wrap:wrap;position:relative;z-index:1}
      .martpay-hero .admin-button{border:1px solid #ffffff35;color:white;background:#ffffff12;white-space:nowrap}
      .martpay-hero .admin-button-primary{background:#ff6801;border-color:#ff6801}
      .martpay-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(10px,1.1vw,18px);margin:clamp(16px,1.7vw,26px) 0}
      .martpay-stat{background:white;border:1px solid #e7ebf2;border-radius:18px;padding:clamp(15px,1.4vw,23px);box-shadow:0 5px 18px #1b2c4710;min-width:0}
      .martpay-stat-top{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#66748a;font-size:12px;font-weight:650}
      .martpay-stat-icon{width:36px;height:36px;display:grid;place-items:center;border-radius:12px;background:#fff1e7;color:#ed6400;font-size:17px;font-weight:900}
      .martpay-stat strong{display:block;font-size:clamp(25px,2vw,34px);line-height:1.3;letter-spacing:-1px;color:#152136;margin-top:8px;overflow-wrap:anywhere}
      .martpay-stat small{display:block;color:#8290a3;font-size:11px;margin-top:3px;line-height:1.5}
      .martpay-section{background:white;border:1px solid #e6eaf1;border-radius:20px;padding:clamp(16px,1.6vw,26px);margin-top:clamp(14px,1.4vw,22px);box-shadow:0 5px 18px #1b2c4708}
      .martpay-section-head{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:18px}
      .martpay-section-head h2{font-size:17px;font-weight:800;color:#182338;margin:0 0 5px}
      .martpay-section-head p{font-size:12px;color:#7c899b;margin:0;line-height:1.6}
      .martpay-gateway-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(10px,1vw,16px)}
      .martpay-gateway{border:1px solid #e8edf4;border-radius:16px;padding:clamp(13px,1.2vw,19px);display:flex;gap:13px;align-items:flex-start;min-width:0;transition:border-color .15s,box-shadow .15s}
      .martpay-gateway:hover{border-color:#ffc08f;box-shadow:0 7px 20px #172c4c0b}
      .martpay-gateway-icon{width:43px;height:43px;flex:0 0 43px;border-radius:13px;background:#fff1e6;color:#f36a0a;display:grid;place-items:center;font-weight:900;font-size:19px}
      .martpay-gateway-body{min-width:0;flex:1}
      .martpay-gateway-title{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:7px}
      .martpay-gateway-title strong{font-size:14px;color:#19263b}
      .martpay-chip{font-size:10px;line-height:1;padding:6px 8px;border-radius:99px;background:#f1f4f8;color:#68758a;font-weight:800;letter-spacing:.3px}
      .martpay-chip.on{background:#e5f8ed;color:#13814b}.martpay-chip.live{background:#fff2df;color:#b45a00}
      .martpay-meta{font-size:12px;color:#7a8798;line-height:1.65;overflow-wrap:anywhere}
      .martpay-gateway-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}
      .martpay-gateway-actions .admin-button{font-size:11px;padding:7px 10px;min-height:32px}
      .martpay-quick-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}
      .martpay-quick{border:1px solid #e7ebf2;border-radius:16px;padding:18px;text-decoration:none!important;color:inherit!important;display:block;transition:transform .15s,border-color .15s;background:linear-gradient(145deg,#fff,#fafbfe)}
      .martpay-quick:hover{transform:translateY(-2px);border-color:#ffb47b}
      .martpay-quick-icon{width:40px;height:40px;border-radius:12px;background:#fff0e5;color:#f26a08;display:grid;place-items:center;font-size:18px;font-weight:900;margin-bottom:14px}
      .martpay-quick strong{font-size:14px;display:block;color:#19263b;margin-bottom:6px}
      .martpay-quick p{font-size:12px;line-height:1.65;color:#7a8798;margin:0 0 12px}
      .martpay-quick span{font-size:12px;color:#e96300;font-weight:800}
      .martpay-security{display:flex;align-items:flex-start;gap:12px;background:#eef6ff;border:1px solid #d8e8ff;border-radius:16px;padding:16px 18px;margin-top:18px;color:#24466f}
      .martpay-security strong{font-size:13px;display:block;margin-bottom:5px}.martpay-security p{font-size:12px;line-height:1.65;margin:0;color:#526d8e}
      .martpay-alert{padding:12px 15px;border-radius:12px;font-size:13px;margin:15px 0}
      .martpay-alert.success{background:#e9f9ef;color:#167445;border:1px solid #c7eed5}.martpay-alert.error{background:#fff0ef;color:#a53229;border:1px solid #f6d1ce}
      .martpay-empty{padding:35px 20px;text-align:center;color:#748197;border:1px dashed #d7dee8;border-radius:14px}
      .martpay-skeleton{border:1px solid #e8edf4;border-radius:16px;padding:16px;display:flex;gap:13px;min-width:0}
      .martpay-skeleton-line{height:12px;border-radius:7px;background:linear-gradient(90deg,#edf0f4 25%,#f7f8fa 37%,#edf0f4 63%);background-size:400% 100%;animation:martpay-shimmer 1.35s ease infinite}
      @keyframes martpay-shimmer{0%{background-position:100% 0}100%{background-position:0 0}}
      @media(prefers-reduced-motion:reduce){.martpay-skeleton-line{animation:none}}
      @media(min-width:1600px){.martpay-gateway-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.martpay-quick-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.martpay-section-head h2{font-size:19px}.martpay-hero p{font-size:15px}}
      @media(max-width:1180px){.martpay-shell .admin-main{padding:24px!important}.martpay-hero{align-items:flex-start}.martpay-hero-actions{flex-shrink:0}.martpay-quick-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.martpay-quick{padding:15px}}
      @media(max-width:1000px){.martpay-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.martpay-quick-grid{grid-template-columns:1fr}}
      @media(max-width:680px){.martpay-shell .admin-main{padding:14px!important}.martpay-hero{padding:23px 19px;border-radius:19px;align-items:flex-start;flex-direction:column}.martpay-hero-actions{width:100%}.martpay-hero-actions .admin-button{flex:1;text-align:center;justify-content:center}.martpay-stats{gap:10px;margin:14px 0}.martpay-stat{padding:14px;border-radius:15px}.martpay-stat strong{font-size:25px}.martpay-section{padding:16px;border-radius:17px}.martpay-section-head{align-items:flex-start;flex-direction:column}.martpay-gateway-grid{grid-template-columns:1fr}.martpay-gateway{padding:13px}.martpay-quick-grid{grid-template-columns:1fr}.martpay-stat-top{font-size:11px}}
    `}</style>
    <AdminSidebar />
    <main className="admin-main">
      <div className="martpay-content">
      <section className="martpay-hero">
        <div><div className="martpay-kicker">MART STORE · FINANCIAL OPERATIONS</div><h1>Mart Pay</h1><p>Your payment control center. Manage merchant methods, review configuration status and jump into transaction operations from one workspace.</p></div>
        <div className="martpay-hero-actions">
          <button className="admin-button" type="button" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "↻ Refresh"}</button>
          <Link className="admin-button admin-button-primary" href="/admin/payment-gateways">＋ Configure gateway</Link>
        </div>
      </section>

      {notice && <div role="status" className="martpay-alert success">{notice}</div>}
      {error && <div role="alert" className="martpay-alert error">{error}</div>}

      <section className="martpay-stats" aria-label="Mart Pay overview">
        <article className="martpay-stat"><div className="martpay-stat-top"><span>Total methods</span><span className="martpay-stat-icon">▦</span></div><strong>{loading ? "—" : gateways.length}</strong><small>Payment methods configured in your store</small></article>
        <article className="martpay-stat"><div className="martpay-stat-top"><span>Enabled methods</span><span className="martpay-stat-icon">✓</span></div><strong>{loading ? "—" : enabledCount}</strong><small>Currently enabled in gateway settings</small></article>
        <article className="martpay-stat"><div className="martpay-stat-top"><span>Live mode</span><span className="martpay-stat-icon">↗</span></div><strong>{loading ? "—" : liveCount}</strong><small>Enabled gateways configured for live mode</small></article>
        <article className="martpay-stat"><div className="martpay-stat-top"><span>Credentials saved</span><span className="martpay-stat-icon">⌑</span></div><strong>{loading ? "—" : configuredCount}</strong><small>Credential sets reported as configured</small></article>
      </section>

      <section className="martpay-section">
        <div className="martpay-section-head"><div><h2>Payment methods</h2><p>Quickly view status and enable or disable supported methods.</p></div><Link className="admin-button admin-button-primary" href="/admin/payment-gateways">Manage all settings ↗</Link></div>
        {loading ? <div className="martpay-gateway-grid" aria-label="Loading payment methods" aria-busy="true">{[1,2,3,4].map(n => <div className="martpay-skeleton" key={n}><div className="martpay-skeleton-line" style={{width:43,height:43,flexShrink:0,borderRadius:13}}/><div style={{flex:1,display:"grid",gap:12,alignContent:"start"}}><div className="martpay-skeleton-line" style={{width:"55%"}}/><div className="martpay-skeleton-line" style={{width:"82%"}}/><div className="martpay-skeleton-line" style={{width:"65%"}}/><div className="martpay-skeleton-line" style={{width:125,height:32,marginTop:5}}/></div></div>)}</div> :
          gateways.length === 0 ? <div className="martpay-empty"><strong>No payment methods found</strong><p>Add a gateway configuration to get started.</p><Link className="admin-button admin-button-primary" href="/admin/payment-gateways">Add payment method</Link></div> :
          <div className="martpay-gateway-grid">{gateways.map(g => <article className="martpay-gateway" key={g.id}>
            <div className="martpay-gateway-icon">{methodIcon[g.type] || "৳"}</div>
            <div className="martpay-gateway-body">
              <div className="martpay-gateway-title"><strong>{methodLabel[g.type] || g.name}</strong><span className={`martpay-chip ${g.enabled ? "on" : ""}`}>{g.enabled ? "ENABLED" : "DISABLED"}</span></div>
              <div className="martpay-meta">{g.name}{g.apiBaseUrl ? ` · ${g.apiBaseUrl}` : ""}</div>
              <div className="martpay-gateway-title" style={{marginTop:9,marginBottom:0}}><span className={`martpay-chip ${g.mode === "LIVE" ? "live" : ""}`}>{g.mode === "LIVE" ? "LIVE MODE" : "SANDBOX / DEMO"}</span><span className="martpay-chip">{g.credentialsConfigured ? "CREDENTIALS SAVED" : "CREDENTIALS UNCONFIRMED"}</span></div>
              <div className="martpay-gateway-actions"><button type="button" className="admin-button" disabled={busyId === g.id || (!g.enabled && !canActivate(g))} title={!g.enabled && !canActivate(g) ? "This provider cannot be activated until a verified automatic adapter and credentials are available." : undefined} onClick={() => void toggle(g)}>{busyId === g.id ? "Saving…" : g.enabled ? "Disable method" : "Enable method"}</button><Link className="admin-button" href="/admin/payment-gateways">Configure ↗</Link></div>
              {!g.enabled && !canActivate(g) && <div className="martpay-meta" style={{marginTop:8,color:"#9a5b17"}}>Activation unavailable: provider integration or required credentials are not verified yet.</div>}
            </div>
          </article>)}</div>}
      </section>

      <section className="martpay-section">
        <div className="martpay-section-head"><div><h2>Payment operations</h2><p>Shortcuts for day-to-day payment management.</p></div></div>
        <div className="martpay-quick-grid">
          <Link href="/admin/payment-gateways" className="martpay-quick"><div className="martpay-quick-icon">⚙</div><strong>Gateway & API settings</strong><p>Manage provider credentials, sandbox/live mode, API endpoints and supported checkout options.</p><span>Open gateway settings →</span></Link>
          <Link href="/admin/payment-transactions" className="martpay-quick"><div className="martpay-quick-icon">⇄</div><strong>Transactions</strong><p>Inspect recorded payment activity and investigate provider transaction statuses.</p><span>View transactions →</span></Link>
          <Link href="/admin/orders" className="martpay-quick"><div className="martpay-quick-icon">▤</div><strong>Orders & payment status</strong><p>Continue to order management to review order progress and fulfilment status.</p><span>Manage orders →</span></Link>
        </div>
      </section>

      <aside className="martpay-security"><div style={{fontSize:22}} aria-hidden="true">♢</div><div><strong>Security and payment integrity</strong><p>API secrets must remain server-side and should never be shown back in the browser. A gateway being enabled or set to LIVE does not itself verify a payment. Real payments must be confirmed using the provider’s authenticated server-side response or webhook. Demo orders remain unpaid test orders.</p></div></aside>
      </div>
    </main>
  </div>;
}
