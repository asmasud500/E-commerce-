"use client";

import { useMemo, useState } from "react";

type Product = {
  id: string; name: string; sku: string; description?: string | null;
  price: number; salePrice?: number | null; stock: number; lowStockThreshold?: number;
  published: boolean; category?: { name: string } | null;
};
type Draft = {
  name: string; description: string; seoTitle: string; metaDescription: string;
  tags: string[]; categorySuggestion: string; sku?: string; price?: number;
};
type Finding = { productId?: string; sku?: string; productName?: string; severity?: string; issue?: string; recommendation?: string };
type Optimization = { productId: string; sku?: string; productName?: string; metaTitle?: string; metaDescription?: string; metaKeywords?: string };
type Result = { mode: string; summary?: string; draft?: Draft; findings?: Finding[]; optimizations?: Optimization[]; recommendations?: string[]; report?: string; model?: string; sampleSize?: number };

export default function AdminProductAIStudio({ products, onRefresh }: { products: Product[]; onRefresh: () => Promise<void> | void }) {
  const [mode, setMode] = useState<"draft" | "seo" | "audit" | "stock" | "pricing">("draft");
  const [brief, setBrief] = useState("");
  const [imageData, setImageData] = useState<{ mimeType: "image/jpeg" | "image/png" | "image/webp"; data: string; name: string } | null>(null);
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedProducts = useMemo(() => products.filter(p => selected.includes(p.id)), [products, selected]);
  const draft = result?.draft;

  async function chooseImage(file?: File) {
    if (!file) return;
    if (!(["image/jpeg", "image/png", "image/webp"] as string[]).includes(file.type)) { setError("শুধু JPG, PNG বা WebP ছবি ব্যবহার করো।"); return; }
    if (file.size > 4 * 1024 * 1024) { setError("ছবির সর্বোচ্চ সাইজ 4 MB।"); return; }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read image.")); reader.onerror = () => reject(new Error("Could not read image.")); reader.readAsDataURL(file); });
      const data = dataUrl.split(",")[1];
      if (!data) throw new Error("Invalid image data.");
      setImageData({ mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", data, name: file.name }); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not read image."); }
  }

  async function runAI() {
    setBusy(true); setError(""); setNotice(""); setResult(null);
    try {
      const response = await fetch("/api/admin/products/ai-automation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, prompt: brief, productIds: mode === "draft" ? [] : selected, ...(mode === "draft" && imageData ? { image: { mimeType: imageData.mimeType, data: imageData.data } } : {}) })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "AI product task failed.");
      setResult(payload.result || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI product task failed.");
    } finally { setBusy(false); }
  }

  async function createDraftProduct() {
    if (!draft) return;
    if (!sku.trim() || !price.trim() || !Number.isFinite(Number(price)) || Number(price) < 0) {
      setError("Save করার আগে একটি unique SKU এবং valid price দিতে হবে।"); return;
    }
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.name, description: draft.description, sku: sku.trim(), price: Number(price), published: false, stock: 0, lowStockThreshold: 5, featured: false, metaTitle: draft.seoTitle, metaDescription: draft.metaDescription, metaKeywords: (draft.tags || []).join(", ") })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save product draft.");
      setNotice("Product draft saved. Review its details, image, category and stock before publishing.");
      await onRefresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save product draft."); }
    finally { setSaving(false); }
  }

  async function applySeoOptimizations() {
    const changes = result?.optimizations || [];
    if (!changes.length || saving) return;
    if (!confirm(`Apply AI SEO metadata to ${changes.length} product(s)? This updates SEO fields only; it does not publish products.`)) return;
    setSaving(true); setError(""); setNotice("");
    let applied = 0; const failed: string[] = [];
    try {
      for (const change of changes) {
        try {
          const response = await fetch("/api/admin/products/" + encodeURIComponent(change.productId), {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...(change.metaTitle ? { metaTitle: change.metaTitle } : {}),
              ...(change.metaDescription ? { metaDescription: change.metaDescription } : {}),
              ...(change.metaKeywords ? { metaKeywords: change.metaKeywords } : {})
            })
          });
          if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "Update rejected"); }
          applied++;
        } catch { failed.push(change.sku || change.productId); }
      }
      setNotice(`SEO update complete: ${applied} saved, ${failed.length} failed${failed.length ? " (" + failed.slice(0, 8).join(", ") + ")" : ""}. Review the audit history for product updates.`);
      await onRefresh();
    } finally { setSaving(false); }
  }

  function toggleSelected(id: string) {
    setSelected(current => current.includes(id) ? current.filter(x => x !== id) : current.length >= 30 ? current : [...current, id]);
  }

  return <section className="product-ai-studio" aria-labelledby="product-ai-title">
    <style jsx>{`
      .product-ai-studio{margin:22px 0;padding:clamp(16px,2.5vw,26px);border:1px solid #dbe4f0;border-radius:20px;background:linear-gradient(135deg,#fff 0%,#f7f9ff 100%);box-shadow:0 12px 32px rgba(19,25,33,.06);color:#131921}
      .pai-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}.pai-kicker{font-size:11px;font-weight:800;letter-spacing:.13em;color:#e25b00}.pai-head h2{margin:6px 0;font-size:clamp(20px,2vw,27px);letter-spacing:-.04em}.pai-head p,.pai-help{margin:0;color:#667085;font-size:13px;line-height:1.6}.pai-status{font-size:11px;font-weight:800;padding:7px 10px;border-radius:999px;background:#e8f7ee;color:#087443;white-space:nowrap}
      .pai-modes{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:20px 0}.pai-mode{padding:10px 8px;border:1px solid #d8dee8;border-radius:12px;background:#fff;color:#344054;font-size:12px;font-weight:750}.pai-mode.active{border-color:#ff6801;background:#fff3eb;color:#a63f00}.pai-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.85fr);gap:18px}.pai-box{border:1px solid #e3e8f0;border-radius:15px;padding:15px;background:rgba(255,255,255,.9);min-width:0}.pai-box h3{font-size:15px;margin:0 0 10px}.pai-box label{display:block;font-size:12px;font-weight:750;margin:12px 0 6px}.pai-box textarea,.pai-box input{width:100%;padding:10px 12px;border:1px solid #d0d5dd;border-radius:10px;background:#fff;color:#101828}.pai-box textarea{resize:vertical;min-height:112px}.pai-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.pai-primary,.pai-secondary{border-radius:10px;padding:10px 13px;font-size:12px;font-weight:800}.pai-primary{background:#ff6801;color:white;border:1px solid #ff6801}.pai-secondary{background:#fff;color:#344054;border:1px solid #d0d5dd}.pai-primary:disabled,.pai-secondary:disabled{opacity:.55;cursor:not-allowed}.pai-products{max-height:250px;overflow:auto;display:grid;gap:7px}.pai-product{display:flex;align-items:flex-start;gap:8px;padding:9px;border:1px solid #e4e7ec;border-radius:10px;font-size:12px}.pai-product input{width:auto;margin-top:3px}.pai-product strong{display:block;color:#101828}.pai-product small{display:block;color:#667085;margin-top:2px}.pai-results{margin-top:16px;border:1px solid #dbe4f0;border-radius:15px;background:#fff;padding:16px;overflow-wrap:anywhere}.pai-results h3{margin:0 0 10px;font-size:16px}.pai-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.pai-field{padding:10px;background:#f8fafc;border-radius:10px}.pai-field span{display:block;color:#667085;font-size:11px;font-weight:750;margin-bottom:4px}.pai-field p{margin:0;color:#101828;font-size:13px;white-space:pre-wrap}.pai-list{padding-left:18px;color:#344054;font-size:13px}.pai-error,.pai-notice{padding:10px 12px;border-radius:10px;font-size:13px;margin-top:12px}.pai-error{background:#fff0f0;color:#b42318}.pai-notice{background:#ecfdf3;color:#067647}.pai-foot{margin-top:12px;font-size:11px;color:#667085;line-height:1.5}
      @media(max-width:760px){.pai-modes{grid-template-columns:repeat(2,minmax(0,1fr))}.pai-body{grid-template-columns:1fr}.pai-grid{grid-template-columns:1fr}.pai-status{white-space:normal}}
    `}</style>
    <div className="pai-head">
      <div><div className="pai-kicker">MART · AI CATALOG INTELLIGENCE</div><h2 id="product-ai-title">AI Product Command Center</h2><p>Create product drafts, audit catalog quality and generate safe recommendations.</p></div>
      <span className="pai-status">Human approval required</span>
    </div>
    <div className="pai-modes" role="group" aria-label="AI product task">
      {([["draft","✦ Create product"],["seo","⌕ SEO optimizer"],["audit","✓ Catalog audit"],["stock","▦ Stock intelligence"],["pricing","↗ Pricing insights"]] as const).map(([key,label]) =>
        <button type="button" key={key} className={"pai-mode"+(mode===key?" active":"")} aria-pressed={mode===key} onClick={()=>{setMode(key);setResult(null);setError("");}}>{label}</button>
      )}
    </div>
    <div className="pai-body">
      <div className="pai-box">
        <h3>{mode === "draft" ? "Describe the product" : mode === "seo" ? "SEO optimization" : mode === "audit" ? "Catalog quality audit" : mode === "stock" ? "Inventory risk analysis" : "Pricing & margin analysis"}</h3>
        <p className="pai-help">{mode === "draft" ? "Provide factual details. AI must not invent specs, materials, warranty or certifications." : "Choose products below. If none are selected, the AI analyzes up to 30 recently updated products."}</p>
        {mode === "draft" ? <>
          <label htmlFor="pai-brief">Product facts / brief</label>
          <textarea id="pai-brief" maxLength={2500} value={brief} onChange={e=>setBrief(e.target.value)} placeholder="Example: Cotton T-shirt, navy blue, sizes M/L/XL, 100% cotton only if confirmed, target audience…"/>
          <label htmlFor="pai-image">Product image (optional · JPG, PNG or WebP · max 4 MB)</label><input id="pai-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void chooseImage(e.target.files?.[0])}/>{imageData&&<p className="pai-help">Selected image: {imageData.name} <button type="button" className="pai-secondary" onClick={()=>setImageData(null)}>Remove image</button></p>}
          <label htmlFor="pai-sku">SKU (required before saving)</label><input id="pai-sku" maxLength={100} value={sku} onChange={e=>setSku(e.target.value)} placeholder="Enter a unique SKU"/>
          <label htmlFor="pai-price">Price (BDT)</label><input id="pai-price" inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Enter verified price"/>
        </> : <>
          <label>Products to analyze ({selected.length}/30 selected)</label>
          <div className="pai-products">{products.slice(0,100).map(p=><label className="pai-product" key={p.id}><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>toggleSelected(p.id)} disabled={!selected.includes(p.id)&&selected.length>=30}/><span><strong>{p.name}</strong><small>{p.sku} · Stock {p.stock} · {p.published?"Published":"Draft"}</small></span></label>)}</div>
          <p className="pai-help">Selection is limited to 30 products per AI request.</p>
        </>}
        <div className="pai-actions"><button type="button" className="pai-primary" disabled={busy||(mode==="draft"&&brief.trim().length<5&&!imageData)} onClick={()=>void runAI()}>{busy?"Analyzing…":mode==="draft"?"Generate draft":"Run AI analysis"}</button>{mode!=="draft"&&<button type="button" className="pai-secondary" onClick={()=>setSelected([])}>Clear selection</button>}</div>
        <p className="pai-foot">AI suggestions are not live product changes. Price, stock and publishing changes require review and explicit admin action.</p>
      </div>
      <div className="pai-box">
        <h3>Automation coverage</h3>
        <ul className="pai-list"><li>Product title, description, SEO title and meta description</li><li>Tags and category suggestions</li><li>Duplicate/incomplete listing checks</li><li>Low-stock and margin-risk recommendations</li><li>Bounded product context and server-side permissions</li></ul>
        <p className="pai-help">Catalog records stay in the database. AI receives only the fields needed for this task; customer and payment information is excluded.</p>
      </div>
    </div>
    {error&&<p className="pai-error" role="alert">{error}</p>}
    {notice&&<p className="pai-notice" role="status">{notice}</p>}
    {result&&<div className="pai-results" aria-live="polite">
      <h3>AI result {result.model ? <small>· {result.model}</small> : null}</h3>
      {result.summary&&<p>{result.summary}</p>}
      {result.draft&&<><div className="pai-grid">{([["Product title",result.draft.name],["Description",result.draft.description],["SEO title",result.draft.seoTitle],["Meta description",result.draft.metaDescription],["Suggested category",result.draft.categorySuggestion],["Tags",(result.draft.tags||[]).join(", ")]] as [string,string][]).map(([label,value])=><div className="pai-field" key={label}><span>{label}</span><p>{value||"Not provided"}</p></div>)}</div><div className="pai-actions"><button type="button" className="pai-primary" disabled={saving||!sku.trim()||!price.trim()} onClick={()=>void createDraftProduct()}>{saving?"Saving…":"Approve & save as unpublished draft"}</button></div><p className="pai-foot">This creates an unpublished draft only. Images, category, variants, stock and all claims must be checked in the normal product editor.</p></>}
      {result.findings&&<div className="pai-products">{result.findings.map((f,i)=><div className="pai-field" key={(f.productId||f.sku||"finding")+i}><span>{(f.severity||"info").toUpperCase()} · {f.productName||f.sku||"Catalog finding"}</span><p><strong>{f.issue||"Review recommended"}</strong><br/>{f.recommendation||""}</p></div>)}</div>}
      {result.optimizations&&<><div className="pai-products">{result.optimizations.map((o,i)=><div className="pai-field" key={o.productId}><span>{o.productName||o.sku||"Product"} · SEO preview</span><p><strong>Title:</strong> {o.metaTitle||"—"}<br/><strong>Description:</strong> {o.metaDescription||"—"}<br/><strong>Keywords:</strong> {o.metaKeywords||"—"}</p></div>)}</div><div className="pai-actions"><button type="button" className="pai-primary" disabled={saving||!result.optimizations.length} onClick={()=>void applySeoOptimizations()}>{saving?"Applying…":"Approve & apply SEO to all listed products"}</button></div><p className="pai-foot">Explicit approval updates only metaTitle, metaDescription and metaKeywords. Each product update passes through the normal authenticated product API.</p></>}
      {result.recommendations&&<ul className="pai-list">{result.recommendations.map((v,i)=><li key={i}>{v}</li>)}</ul>}
      {result.report&&<p style={{whiteSpace:"pre-wrap"}}>{result.report}</p>}
      {result.sampleSize!==undefined&&<p className="pai-foot">Analysis sample: {result.sampleSize} product(s). Recommendations reflect this sample, not necessarily the full catalog.</p>}
    </div>}
  </section>;
}
