"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import AdminSidebar from "@/components/AdminSidebar";
import { parseOptionsText } from "@/lib/options";
import { fileToCompressedDataUrl } from "@/lib/client-image";
import { generateVariantCombinations, variantKey } from "@/lib/product-variants";

type Category = { id: string; name: string };
type ImageDraft = { url: string; alt: string };

const fieldStyle: React.CSSProperties = { width: "100%", padding: "11px 12px", border: "1px solid #d1d5db", borderRadius: 9, background: "#fff", color: "#111827", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { display: "grid", gap: 7, fontSize: 14, fontWeight: 600, color: "#374151" };
const cardStyle: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 22, display: "grid", gap: 16, marginBottom: 18 };

function makeSku(name: string) {
  const base = name.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toUpperCase().slice(0, 22);
  return base ? `${base}-${Math.random().toString(36).slice(2, 7).toUpperCase()}` : "";
}

export default function NewProduct() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: "", sku: "", slug: "", price: "", compareAtPrice: "", salePrice: "", stock: "0", lowStockThreshold: "5", categoryId: "", description: "", published: false, featured: false, freeShipping: false, shippingFee: "", options: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [manualSelection, setManualSelection] = useState<Record<string, string>>({});
  const [images, setImages] = useState<ImageDraft[]>([{ url: "", alt: "" }]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [skuTouched, setSkuTouched] = useState(false);

  useEffect(() => {
    fetch("/api/admin/categories", { cache: "no-store" }).then(async r => {
      if (!r.ok) throw new Error("Categories could not be loaded");
      const data = await r.json();
      setCategories(Array.isArray(data) ? data : []);
    }).catch(() => setMessage("Category list could not load. You can still create a product without a category."));
  }, []);

  const set = (key: keyof typeof form, value: string | boolean) => setForm(old => ({ ...old, [key]: value }));
  const slugPreview = useMemo(() => (form.slug || form.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), [form.slug, form.name]);
  const validImages = images.filter(i => i.url.trim());

  function addImage() { setImages(old => [...old, { url: "", alt: "" }]); }
  function generateVariants() {
    const combos = generateVariantCombinations(parseOptionsText(form.options));
    const previous = new Map<string, any>(); variants.forEach(v => previous.set(variantKey(v.options), v));
    setVariants(combos.map(options => previous.get(variantKey(options)) || { id: variantKey(options), options, sku: [form.sku, ...Object.values(options)].filter(Boolean).join("-").replace(/[^a-zA-Z0-9-]/g,"-").toUpperCase().slice(0,100), price: Number(form.price)||0, salePrice: "", compareAtPrice: "", stock: 0, lowStockThreshold: 5 }));
    if (!combos.length) setMessage("Add options such as Size: S, M, L and Color: Black, White first.");
    else setMessage(combos.length + " variant combinations generated. Set a price and stock for each.");
  }
  function updateVariant(index: number, key: string, value: string) { setVariants(old => old.map((v,i) => i===index ? {...v,[key]:value} : v)); }
  function addManualVariant() {
    const defs = parseOptionsText(form.options);
    if (!defs.length) return setMessage("Add product options before adding a variant.");
    if (variants.length >= 200) return setMessage("A product can have at most 200 variant rows.");
    const options = Object.fromEntries(defs.map(o => [o.name, manualSelection[o.name] || o.values[0]]));
    const key = variantKey(options);
    if (variants.some(v => variantKey(v.options || {}) === key)) return setMessage("This combination already exists. Choose another or remove the existing row first.");
    setVariants(old => [...old, { id:key, options, sku:[form.sku,...Object.values(options)].filter(Boolean).join("-").replace(/[^a-zA-Z0-9-]/g,"-").toUpperCase().slice(0,100), price:Number(form.price)||0, salePrice:"", compareAtPrice:"", stock:0, lowStockThreshold:5 }]);
    setMessage("Variant added. Set its price and stock before saving.");
  }
  function deleteVariant(index:number) { setVariants(old => old.filter((_,i)=>i!==index)); setMessage("Variant removed. Save the product to apply the change."); }

  function updateImage(index: number, key: keyof ImageDraft, value: string) {
    setImages(old => old.map((image, i) => i === index ? { ...image, [key]: value } : image));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const price = Number(form.price), sale = form.salePrice === "" ? null : Number(form.salePrice);
    const compare = form.compareAtPrice === "" ? null : Number(form.compareAtPrice);
    const stock = Number(form.stock), threshold = Number(form.lowStockThreshold);
    if (!Number.isFinite(price) || price < 0) return setMessage("Enter a valid selling price.");
    if (sale !== null && (!Number.isFinite(sale) || sale < 0 || sale > price)) return setMessage("Sale price must be between ৳0 and the regular price.");
    if (compare !== null && (!Number.isFinite(compare) || compare < price)) return setMessage("Compare-at price should be equal to or higher than the regular price.");
    if (!Number.isInteger(stock) || stock < 0 || !Number.isInteger(threshold) || threshold < 0) return setMessage("Stock and low-stock threshold must be whole numbers (0 or higher).");
    if (variants.length > 200) return setMessage("A product can have at most 200 variant rows.");
    const keys = variants.map(v => variantKey(v.options || {}));
    if (new Set(keys).size !== keys.length) return setMessage("Duplicate variant combinations found. Remove duplicates before saving.");
    const variantSkus = variants.map(v => String(v.sku || "").trim().toLowerCase()).filter(Boolean);
    if (new Set(variantSkus).size !== variantSkus.length) return setMessage("Each variant must have a unique SKU.");
    for (const [index, variant] of variants.entries()) {
      const variantPrice = Number(variant.price);
      const variantSale = variant.salePrice === "" || variant.salePrice == null ? null : Number(variant.salePrice);
      const variantCompare = variant.compareAtPrice === "" || variant.compareAtPrice == null ? null : Number(variant.compareAtPrice);
      const variantStock = Number(variant.stock);
      const variantThreshold = Number(variant.lowStockThreshold);
      if (!Number.isFinite(variantPrice) || variantPrice < 0) return setMessage(`Variant ${index + 1}: enter a valid price.`);
      if (variantSale !== null && (!Number.isFinite(variantSale) || variantSale < 0 || variantSale > variantPrice)) return setMessage(`Variant ${index + 1}: sale price must not exceed its regular price.`);
      if (variantCompare !== null && (!Number.isFinite(variantCompare) || variantCompare < variantPrice)) return setMessage(`Variant ${index + 1}: compare-at price must be equal to or higher than regular price.`);
      if (!Number.isInteger(variantStock) || variantStock < 0 || !Number.isInteger(variantThreshold) || variantThreshold < 0) return setMessage(`Variant ${index + 1}: stock and low-stock alert must be whole numbers (0 or higher).`);
    }
    for (const image of validImages) {
      try { const u = new URL(image.url); if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error(); }
      catch { return setMessage("Each product image must have a valid http:// or https:// URL."); }
    }

    setBusy(true);
    try {
      const sku = form.sku.trim() || makeSku(form.name);
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(), sku, slug: form.slug.trim() || undefined,
          description: form.description.trim() || null, price, compareAtPrice: compare,
          salePrice: sale, stock, lowStockThreshold: threshold,
          featured: form.featured, published: form.published, categoryId: form.categoryId || null,
          options: parseOptionsText(form.options), variants: variants.map(v => ({...v, price: Number(v.price), salePrice: v.salePrice === "" ? null : Number(v.salePrice), compareAtPrice: v.compareAtPrice === "" ? null : Number(v.compareAtPrice), stock: Number(v.stock), lowStockThreshold: Number(v.lowStockThreshold)})), freeShipping: form.freeShipping, shippingFee: form.shippingFee === "" ? null : Number(form.shippingFee)
        })
      });
      const product = await response.json();
      if (!response.ok) throw new Error(product.error || "Product could not be created.");

      const imageFailures: string[] = [];
      for (let index = 0; index < validImages.length; index++) {
        const image = validImages[index];
        const imageResponse = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}/images`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: image.url.trim(), alt: image.alt.trim() || form.name.trim(), sortOrder: index })
        });
        if (!imageResponse.ok) imageFailures.push(image.url);
      }
      for (const f of files) {
        try {
          const dataUrl = await fileToCompressedDataUrl(f);
          const up = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}/images/upload`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl, alt: form.name.trim() })
          });
          if (!up.ok) imageFailures.push(f.name);
        } catch { imageFailures.push(f.name); }
      }
      if (imageFailures.length) {
        setMessage(`Product created, but ${imageFailures.length} image(s) could not be saved. You can add them from the edit page.`);
        setTimeout(() => { window.location.href = `/admin/products/${encodeURIComponent(product.id)}`; }, 1400);
        return;
      }
      window.location.href = "/admin/products";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Create failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const textField = (key: keyof typeof form, label: string, options: { required?: boolean; type?: string; placeholder?: string; help?: string; min?: string; step?: string } = {}) => (
    <label key={key} style={labelStyle}>
      {label}{options.required && <span style={{ color: "#b91c1c" }}> *</span>}
      <input style={fieldStyle} required={options.required} type={options.type || "text"} min={options.min} step={options.step} placeholder={options.placeholder} value={String(form[key])} onChange={e => {
        const value = e.target.value;
        set(key, value);
        if (key === "name" && !skuTouched) set("sku", makeSku(value));
      }} />
      {options.help && <small style={{ fontWeight: 400, color: "#6b7280" }}>{options.help}</small>}
    </label>
  );

  return <div className="admin-layout">
    <AdminSidebar />
    <main className="admin-content product-editor-page">
      <div className="admin-page-head" style={{ marginBottom: 22 }}>
        <div style={{ width: "100%" }}>
          <div className="admin-kicker">MART · CATALOG MANAGEMENT</div>
          <Link href="/admin/products" style={{ display: "inline-flex", margin: "5px 0 10px", color: "#c2410c", fontWeight: 700, textDecoration: "none" }}>← Back to products</Link>
          <h1 style={{ margin: "0 0 7px", letterSpacing: "-.035em" }}>Create a product</h1>
          <p style={{ margin: 0, maxWidth: 720, lineHeight: 1.7 }}>Create a complete, customer-ready listing. Configure product variants early to manage every option, price and stock level in one place.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 10, marginTop: 20 }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 13, background: "#fff" }}><small style={{ color: "#64748b", display: "block" }}>Product name</small><strong style={{ display: "block", marginTop: 4, overflowWrap: "anywhere" }}>{form.name.trim() || "Not added yet"}</strong></div>
            <div style={{ border: "1px solid #fed7aa", borderRadius: 12, padding: 13, background: "#fff7ed" }}><small style={{ color: "#9a3412", display: "block" }}>Variant combinations</small><strong style={{ display: "block", marginTop: 4, fontSize: 18, color: "#9a3412" }}>{variants.length} configured</strong></div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 13, background: "#fff" }}><small style={{ color: "#64748b", display: "block" }}>Store status</small><strong style={{ display: "block", marginTop: 4, color: form.published ? "#15803d" : "#475569" }}>{form.published ? "Publish on save" : "Draft"}</strong></div>
          </div>
        </div>
      </div>

      {message && <p role="status" aria-live="polite" style={{ padding: 12, borderRadius: 9, background: "#fff7ed", color: "#9a3412", marginBottom: 16 }}>{message}</p>}

      <form onSubmit={submit}>
        <section style={cardStyle}>
          <div><h2 style={{ margin: 0, fontSize: 19 }}>1. Product information</h2><p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 14 }}>Name, SKU and description customers will see.</p></div>
          {textField("name", "Product name", { required: true, placeholder: "e.g. Premium Cotton T-Shirt" })}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 14 }}>
            <label style={labelStyle}>SKU (Stock Keeping Unit)
              <input style={fieldStyle} value={form.sku} placeholder="Auto-generated if left blank" onChange={e => { setSkuTouched(true); set("sku", e.target.value); }} />
              <small style={{ fontWeight: 400, color: "#6b7280" }}>Must be unique. You can edit the generated value.</small>
            </label>
            {textField("slug", "Product URL slug", { placeholder: slugPreview || "auto-from-product-name", help: `Preview: /products/${slugPreview || "product-name"}` })}
          </div>
          <label style={labelStyle}>Description
            <textarea style={{ ...fieldStyle, minHeight: 140, resize: "vertical" }} maxLength={5000} placeholder="Describe features, material, size, usage and what is included…" value={form.description} onChange={e => set("description", e.target.value)} />
            <small style={{ fontWeight: 400, color: "#6b7280" }}>{form.description.length}/5000 characters</small>
          </label>
          <label style={labelStyle}>Category
            <select style={fieldStyle} value={form.categoryId} onChange={e => set("categoryId", e.target.value)}><option value="">No category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </label>
        </section>

        <section style={{ ...cardStyle, border: "2px solid #fb923c", background: "linear-gradient(145deg, #fff7ed 0%, #ffffff 55%, #fffaf5 100%)", boxShadow: "0 10px 28px rgba(234,88,12,.08)", padding: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ flex: "0 0 46px", width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: 14, background: "#ea580c", color: "#fff", fontSize: 23, fontWeight: 800 }}>⌘</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><h2 style={{ margin: 0, fontSize: 21, color: "#111827" }}>2. Product options & variants</h2><span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", background: "#ffedd5", color: "#9a3412", padding: "5px 8px", borderRadius: 999 }}>Important</span></div>
              <p style={{ margin: "6px 0 0", color: "#57534e", fontSize: 14, lineHeight: 1.65 }}>Build selectable product combinations for any category—electronics, food, furniture, cosmetics, bundles, digital goods and more. Each variant can have its own SKU, price and stock.</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: 10 }}>
            <div style={{ padding: 12, border: "1px solid #fed7aa", borderRadius: 11, background: "#fff" }}><small style={{ color: "#78716c", display: "block" }}>Attributes</small><strong style={{ fontSize: 20, color: "#9a3412" }}>{parseOptionsText(form.options).length}/5</strong></div>
            <div style={{ padding: 12, border: "1px solid #fed7aa", borderRadius: 11, background: "#fff" }}><small style={{ color: "#78716c", display: "block" }}>Combinations</small><strong style={{ fontSize: 20, color: "#9a3412" }}>{generateVariantCombinations(parseOptionsText(form.options)).length}/200</strong></div>
            <div style={{ padding: 12, border: "1px solid #fed7aa", borderRadius: 11, background: "#fff" }}><small style={{ color: "#78716c", display: "block" }}>Configured rows</small><strong style={{ fontSize: 20, color: "#9a3412" }}>{variants.length}</strong></div>
          </div>
          <label style={labelStyle}>Options (one attribute per line)
            <textarea rows={5} value={form.options} onChange={e => set("options", e.target.value)} style={{...fieldStyle,minHeight:112,resize:"vertical"}} placeholder={"Color: Black, White\nStorage: 128 GB, 256 GB\nMaterial: Steel, Aluminium\nPack size: Single, Pack of 3"} />
            <small style={{fontWeight:400,color:"#57534e",lineHeight:1.7}}>One attribute per line: <strong>Attribute: value 1, value 2</strong>. Examples: Model, Storage, Capacity, Material, Finish, Flavour, Weight, Pack size, Compatibility, Warranty or Bundle. Up to 5 attributes, 30 values per attribute and 200 generated combinations.</small>
          </label>
          {parseOptionsText(form.options).length>0 && <div style={{display:"grid",gap:10,padding:14,border:"1px dashed #fb923c",borderRadius:11,background:"#fff"}}><strong style={{color:"#7c2d12"}}>Add a combination manually</strong><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,150px),1fr))",gap:10}}>{parseOptionsText(form.options).map(option=><label key={option.name} style={labelStyle}>{option.name}<select value={manualSelection[option.name]||option.values[0]||""} onChange={e=>setManualSelection(old=>({...old,[option.name]:e.target.value}))} style={fieldStyle}>{option.values.map(value=><option key={value} value={value}>{value}</option>)}</select></label>)}</div><div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}><button type="button" onClick={addManualVariant} style={{padding:"10px 14px",borderRadius:9,border:"1px solid #ea580c",background:"#fff7ed",color:"#9a3412",fontWeight:800}}>＋ Add selected combination</button><small style={{color:"#78716c"}}>Duplicate combinations are blocked. Removed combinations can be added again.</small></div></div>}<div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><button type="button" onClick={generateVariants} style={{padding:"11px 16px",borderRadius:9,border:0,background:"#ea580c",color:"#fff",fontWeight:800,cursor:"pointer",boxShadow:"0 3px 8px rgba(234,88,12,.2)"}}>✦ Generate / refresh variants</button><small style={{color:"#57534e"}}>Generate after editing options. Existing matching rows keep their SKU, price and stock.</small></div>
          {variants.length>0 && <div style={{overflowX:"auto",border:"1px solid #fed7aa",borderRadius:12,background:"#fff"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:820}}><thead><tr>{["Variant combination","Variant SKU","Price (৳)","Sale price (৳)","Stock","Low-stock alert","Action"].map(h=><th key={h} style={{textAlign:"left",padding:11,borderBottom:"1px solid #fed7aa",background:"#fff7ed",color:"#7c2d12",fontSize:12,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead><tbody>{variants.map((v,i)=><tr key={variantKey(v.options)}><td style={{padding:9,borderBottom:"1px solid #f1f5f9",fontWeight:600}}>{Object.entries(v.options).map(([k,val])=>k+": "+val).join(" · ")}</td><td style={{padding:6}}><input style={{...fieldStyle,minWidth:110}} value={v.sku||""} onChange={e=>updateVariant(i,"sku",e.target.value)} /></td><td style={{padding:6}}><input required type="number" min="0" step=".01" style={{...fieldStyle,minWidth:100}} value={v.price} onChange={e=>updateVariant(i,"price",e.target.value)} /></td><td style={{padding:6}}><input type="number" min="0" step=".01" style={{...fieldStyle,minWidth:100}} value={v.salePrice} onChange={e=>updateVariant(i,"salePrice",e.target.value)} /></td><td style={{padding:6}}><input required type="number" min="0" step="1" style={{...fieldStyle,minWidth:80}} value={v.stock} onChange={e=>updateVariant(i,"stock",e.target.value)} /></td><td style={{padding:6}}><input type="number" min="0" step="1" style={{...fieldStyle,minWidth:90}} value={v.lowStockThreshold} onChange={e=>updateVariant(i,"lowStockThreshold",e.target.value)} /></td><td style={{padding:6}}><button type="button" onClick={()=>deleteVariant(i)} style={{padding:"8px 10px",border:"1px solid #fecaca",borderRadius:8,background:"#fff1f2",color:"#b91c1c",fontWeight:700}}>Delete Record</button></td></tr>)}</tbody></table><div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",padding:12,marginTop:12,background:"#fff7ed",borderRadius:10,color:"#7c2d12"}}><strong>Total variant stock: {variants.reduce((n,v)=>n+Math.max(0,Number(v.stock)||0),0)} units</strong><small>Each combination has its own SKU, price and stock. Keep this table updated to avoid overselling.</small></div></div>}
        </section>

        <section style={cardStyle}>
          <div><h2 style={{ margin: 0, fontSize: 19 }}>3. Pricing (BDT)</h2><p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 14 }}>Set regular price and optional sale/compare price.</p></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
            {textField("price", "Regular price (৳)", { required: true, type: "number", min: "0", step: "0.01", placeholder: "e.g. 1200.00" })}
            {textField("compareAtPrice", "Compare-at price (৳)", { type: "number", min: "0", step: "0.01", placeholder: "Optional" })}
            {textField("salePrice", "Sale price (৳)", { type: "number", min: "0", step: "0.01", placeholder: "Optional; must not exceed regular price" })}
          </div>
          <p style={{ margin: 0, padding: 12, background: "#f9fafb", borderRadius: 9, color: "#4b5563", fontSize: 14 }}>Store currency: Bangladeshi Taka (৳). Leave optional prices empty if they do not apply.</p>
        </section>

        <section style={cardStyle}>
          <div><h2 style={{ margin: 0, fontSize: 19 }}>4. Inventory</h2><p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 14 }}>Control available stock and low-stock alerts.</p></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {textField("stock", "Available quantity", { required: true, type: "number", min: "0", step: "1" })}
            {textField("lowStockThreshold", "Low-stock threshold", { required: true, type: "number", min: "0", step: "1", help: "Used to identify products that need restocking." })}
          </div>
        </section>

        <section style={cardStyle}>
          <div><h2 style={{ margin: 0, fontSize: 19 }}>5. Product images</h2><p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 14 }}>Add one or more direct image URLs (HTTPS recommended). Images are saved after the product is created.</p></div>
          {images.map((image, index) => <div key={index} style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr) auto", gap: 10, alignItems: "end" }}>
            <label style={labelStyle}>Image URL {index + 1}
              <input style={fieldStyle} type="url" placeholder="https://example.com/product-image.webp" value={image.url} onChange={e => updateImage(index, "url", e.target.value)} />
            </label>
            <label style={labelStyle}>Alt text
              <input style={fieldStyle} placeholder={form.name || "Describe image"} value={image.alt} onChange={e => updateImage(index, "alt", e.target.value)} />
            </label>
            <button type="button" onClick={() => setImages(old => old.filter((_, i) => i !== index))} disabled={images.length === 1} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>Remove Item</button>
          </div>)}
          <label style={labelStyle}>Upload pictures from your device<input type="file" accept="image/*" multiple onChange={e => setFiles(Array.from(e.target.files || []))} style={fieldStyle} /></label>
          {files.length > 0 && <small style={{ color: "#6b7280" }}>{files.length} file(s) selected — compressed automatically and saved after the product is created.</small>}
          <div><button type="button" onClick={addImage} style={{ padding: "9px 13px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>+ Add another image</button></div>
          {validImages[0]?.url && <div style={{ display: "flex", gap: 12, alignItems: "center" }}><img src={validImages[0].url} alt="First product image preview" style={{ width: 86, height: 86, objectFit: "cover", borderRadius: 10, border: "1px solid #e5e7eb" }} onError={e => { e.currentTarget.style.display = "none"; }} /><small style={{ color: "#6b7280" }}>Preview of the first image URL</small></div>}
        </section>

        <section style={{ ...cardStyle, borderColor: "#fed7aa", background: "linear-gradient(135deg, #fff 0%, #fff7ed 100%)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 42, height: 42, flex: "0 0 42px", display: "grid", placeItems: "center", borderRadius: 12, background: "#ffedd5", color: "#c2410c", fontSize: 20 }}>↗</div>
            <div><h2 style={{ margin: 0, fontSize: 19 }}>6. Delivery options</h2><p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 14, lineHeight: 1.6 }}>Choose free delivery, set a product-specific fee, or leave the fee empty to use the configured delivery-area rate.</p></div>
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 14, border: "1px solid #fed7aa", borderRadius: 11, background: form.freeShipping ? "#fff7ed" : "#fff", cursor: "pointer" }}>
            <input type="checkbox" checked={form.freeShipping} onChange={e => set("freeShipping", e.target.checked)} style={{ marginTop: 3, accentColor: "#ea580c", width: 17, height: 17 }} />
            <span><strong style={{ display: "block", color: "#111827" }}>Free delivery for this product</strong><small style={{ display: "block", marginTop: 3, color: "#6b7280", fontWeight: 400 }}>Customers won't be charged the standard delivery fee for this item.</small></span>
          </label>
          <label style={labelStyle}>Custom delivery fee (৳)
            <input type="number" min="0" step=".01" disabled={form.freeShipping} value={form.shippingFee} onChange={e => set("shippingFee", e.target.value)} style={{ ...fieldStyle, opacity: form.freeShipping ? .55 : 1 }} placeholder={form.freeShipping ? "Not needed for free delivery" : "Leave blank to use area/default fee"} />
            <small style={{ color: "#6b7280", fontWeight: 400 }}>Enter the amount in Bangladeshi Taka. Use 0 to override the fee as free.</small>
          </label>
        </section>

        <section style={cardStyle}>
          <div><h2 style={{ margin: 0, fontSize: 19 }}>7. Store visibility</h2><p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 14, lineHeight: 1.6 }}>Choose whether the item is highlighted on the storefront or available for customers to buy.</p></div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 14, border: "1px solid #e5e7eb", borderRadius: 11, background: form.featured ? "#fff7ed" : "#fff", cursor: "pointer" }}>
            <input type="checkbox" checked={form.featured} onChange={e => set("featured", e.target.checked)} style={{ marginTop: 3, accentColor: "#ea580c", width: 17, height: 17 }} />
            <span><strong style={{ display: "block", color: "#111827" }}>Featured product</strong><small style={{ display: "block", marginTop: 3, color: "#6b7280", fontWeight: 400 }}>Highlight this item in featured product sections where supported.</small></span>
          </label>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 14, border: "1px solid #e5e7eb", borderRadius: 11, background: form.published ? "#fff7ed" : "#fff", cursor: "pointer" }}>
            <input type="checkbox" checked={form.published} onChange={e => set("published", e.target.checked)} style={{ marginTop: 3, accentColor: "#ea580c", width: 17, height: 17 }} />
            <span><strong style={{ display: "block", color: "#111827" }}>Publish immediately</strong><small style={{ display: "block", marginTop: 3, color: "#6b7280", fontWeight: 400 }}>{form.published ? "This product will appear on the storefront after saving." : "Keep this product as a draft until you're ready to publish."}</small></span>
          </label>
          <div style={{ padding: 12, borderRadius: 10, background: "#f9fafb", color: "#4b5563", fontSize: 13, lineHeight: 1.6 }}><strong style={{ color: "#111827" }}>Current status:</strong> {form.published ? "Ready to publish" : "Draft"} · {form.featured ? "Featured listing enabled" : "Standard listing"}</div>
        </section>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", padding: 16, marginBottom: 32, border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", boxShadow: "0 4px 16px rgba(15,23,42,.04)" }}>
          <div style={{ minWidth: 180 }}><strong style={{ display: "block", color: "#111827" }}>{form.published ? "Ready to publish" : "Save for later"}</strong><small style={{ color: "#6b7280" }}>{form.published ? "Your product will be published when you save." : "Your product details will be saved as a draft."}</small></div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/admin/products" style={{ padding: "11px 17px", border: "1px solid #d1d5db", borderRadius: 9, textDecoration: "none", color: "#374151", background: "#fff", fontWeight: 600, textAlign: "center" }}>Cancel</Link>
            <button type="submit" disabled={busy} style={{ padding: "12px 20px", border: 0, borderRadius: 9, background: busy ? "#9ca3af" : "#ea580c", color: "#fff", fontWeight: 700, cursor: busy ? "wait" : "pointer", boxShadow: "0 2px 5px rgba(234,88,12,.18)" }}>{busy ? "Saving product…" : form.published ? "Create & Publish Product →" : "Save Product as Draft →"}</button>
          </div>
        </div>
      </form>
    </main>
  </div>;
}
