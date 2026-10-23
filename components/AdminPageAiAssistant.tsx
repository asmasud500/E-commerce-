"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const pages = [
  ["/admin/orders", "orders", "Orders & fulfilment"],
  ["/admin/returns", "returns", "Returns & refunds"],
  ["/admin/products", "products", "Products"],
  ["/admin/inventory", "inventory", "Inventory management"],
  ["/admin/categories", "categories", "Categories"],
  ["/admin/customers", "customers", "Customers"],
  ["/admin/reviews", "reviews", "Reviews & moderation"],
  ["/admin/mart-pay", "mart-pay", "Mart Pay"],
  ["/admin/payment-transactions", "transactions", "Transactions"],
  ["/admin/coupons", "coupons", "Coupons & discounts"],
  ["/admin/gift-cards", "gift-cards", "Gift cards"],
  ["/admin/marketing", "marketing", "Marketing"],
  ["/admin/flash-sales", "flash-sales", "Flash sales"],
  ["/admin/delivery-zones", "delivery-zones", "Delivery zones"],
  ["/admin/banners", "banners", "Store banners"],
  ["/admin/storage", "storage", "Storage Health"],
  ["/admin/settings", "settings", "Store settings"],
  ["/admin/integrations", "integrations", "Integrations & API"],
  ["/admin/staff", "staff", "Staff & permissions"]
] as const;

const starterPrompts: Record<string, string> = {
  orders: "Help me review fulfilment bottlenecks and create a safe checklist.",
  returns: "Help me review this return case and identify policy checks.",
  products: "Audit this product content for completeness and SEO.",
  inventory: "Help me prioritize stock risks. Tell me what evidence is missing.",
  categories: "Review category structure and suggest cleanup candidates.",
  customers: "Suggest privacy-preserving customer retention ideas.",
  reviews: "Summarize these review themes and draft a neutral reply.",
  "mart-pay": "Help diagnose this gateway issue using the redacted details below.",
  transactions: "Help me investigate this transaction mismatch.",
  coupons: "Review these coupon rules for conflicts and margin risks.",
  "gift-cards": "Help analyze this gift-card report without changing balances.",
  marketing: "Create a practical marketing plan for this store.",
  "flash-sales": "Review flash-sale readiness and possible stockout risks.",
  "delivery-zones": "Review these delivery-zone rules for inconsistencies.",
  banners: "Create a responsive banner brief and check required fields.",
  storage: "Help interpret this redacted storage or backup error log.",
  settings: "Review this configuration snapshot for gaps and rollback checks.",
  integrations: "Diagnose this redacted webhook/API error and suggest safe checks.",
  staff: "Review this role matrix for least-privilege recommendations."
};

export default function AdminPageAiAssistant() {
  const pathname = usePathname();
  const page = useMemo(() => [...pages].sort((a,b) => b[0].length-a[0].length).find(([path]) => pathname === path || pathname.startsWith(path + "/")) || ["/admin", "settings", "Store admin"] as const, [pathname]);
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState("");

  async function ask(value?: string) {
    const question = (value ?? prompt).trim();
    if (!question || busy) return;
    setBusy(true); setError(""); setAnswer("");
    try {
      const response = await fetch("/api/ai/admin-assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageKey: page[1], pageTitle: page[2], prompt: question, language: "Bangla and English" })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "AI assistant request failed.");
      setAnswer(payload.answer || "No answer was returned."); setModel(payload.model || "");
      setPrompt(question);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI assistant request failed.");
    } finally { setBusy(false); }
  }

  return <>
    <button type="button" className="admin-ai-fab" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-controls="admin-page-ai-panel">
      <span aria-hidden="true">✦</span> AI Assistant
    </button>
    {open && <section id="admin-page-ai-panel" className="admin-ai-panel" aria-label={page[2] + " AI assistant"}>
      <header className="admin-ai-header">
        <div><strong>✦ {page[2]} Assistant</strong><small>Read-only guidance · Human approval required</small></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close AI assistant">×</button>
      </header>
      <div className="admin-ai-body">
        <p className="admin-ai-context">Page-aware help for <strong>{page[2]}</strong>. The assistant only sees the notes you submit; it does not automatically read or change page records.</p>
        <button type="button" className="admin-ai-suggestion" disabled={busy} onClick={() => { setPrompt(starterPrompts[page[1]] || "Help me review this admin page safely."); void ask(starterPrompts[page[1]] || "Help me review this admin page safely."); }}>✦ Suggested: {starterPrompts[page[1]] || "Review this page safely"}</button>
        <label htmlFor="admin-ai-question">Question or redacted details</label>
        <textarea id="admin-ai-question" rows={4} maxLength={3000} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ask in Bangla or English. Paste only redacted logs/details—never passwords, OTPs, or API keys." />
        <button type="button" className="admin-ai-submit" disabled={busy || prompt.trim().length < 2} onClick={() => void ask()}>{busy ? "Analyzing…" : "Ask AI"}</button>
        {error && <p className="admin-ai-error" role="alert">{error}</p>}
        {answer && <div className="admin-ai-answer"><div className="admin-ai-answer-title">AI recommendation {model ? "· " + model : ""}</div><p>{answer}</p><button type="button" className="admin-ai-copy" onClick={() => { void navigator.clipboard?.writeText(answer); }}>Copy response</button></div>}
        <small className="admin-ai-safety">Suggestions only. Payments, refunds, inventory, publishing, settings and permissions are never changed by AI.</small>
      </div>
    </section>}
    <style jsx global>{`
      .admin-ai-fab{position:fixed;right:20px;bottom:20px;z-index:1100;border:0;border-radius:999px;background:#131921;color:#fff;padding:11px 17px;font-size:13px;font-weight:700;box-shadow:0 8px 28px #13192130;cursor:pointer}
      .admin-ai-fab span{color:#ff8a3d;margin-right:6px}
      .admin-ai-panel{position:fixed;right:20px;bottom:76px;z-index:1101;width:min(390px,calc(100vw - 24px));max-height:min(76vh,720px);overflow:auto;border:1px solid #dce1e7;border-radius:16px;background:#fff;color:#18202b;box-shadow:0 20px 70px #10182838}
      .admin-ai-header{position:sticky;top:0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;background:#131921;color:white;border-radius:15px 15px 0 0}
      .admin-ai-header strong,.admin-ai-header small{display:block}.admin-ai-header strong{font-size:14px}.admin-ai-header small{font-size:11px;color:#c7ced8;margin-top:4px}
      .admin-ai-header button{border:0;background:transparent;color:white;font-size:25px;cursor:pointer}
      .admin-ai-body{padding:14px;display:grid;gap:10px}.admin-ai-context,.admin-ai-safety{font-size:12px;line-height:1.5;color:#667085;margin:0}
      .admin-ai-suggestion{border:1px solid #ffd4b5;background:#fff7f0;color:#793300;border-radius:9px;padding:9px;text-align:left;font-size:12px;cursor:pointer}
      .admin-ai-body label{font-size:12px;font-weight:700}.admin-ai-body textarea{width:100%;box-sizing:border-box;resize:vertical;border:1px solid #cfd5dd;border-radius:9px;padding:10px;font:inherit;font-size:13px;min-height:84px}
      .admin-ai-submit{border:0;border-radius:9px;background:#ff6801;color:white;padding:10px 14px;font-weight:700;cursor:pointer}.admin-ai-submit:disabled,.admin-ai-suggestion:disabled{opacity:.55;cursor:wait}
      .admin-ai-error{color:#b42318;font-size:12px}.admin-ai-answer{white-space:pre-wrap;overflow-wrap:anywhere;background:#f7f8fa;border:1px solid #e4e7ec;border-radius:10px;padding:12px;font-size:13px;line-height:1.55}.admin-ai-answer-title{font-weight:700;font-size:12px;margin-bottom:8px;color:#344054}.admin-ai-answer p{margin:0}
      .admin-ai-copy{margin-top:10px;border:1px solid #d0d5dd;background:#fff;border-radius:7px;padding:6px 10px;font-size:12px;cursor:pointer}
      @media(max-width:600px){.admin-ai-fab{right:12px;bottom:12px;padding:10px 14px}.admin-ai-panel{right:12px;bottom:64px;max-height:78dvh}}
    `}</style>
  </>;
}
