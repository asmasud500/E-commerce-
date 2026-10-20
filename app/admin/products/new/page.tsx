"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import AdminSidebar from "@/components/AdminSidebar";
import { parseOptionsText } from "@/lib/options";
import { fileToCompressedDataUrl } from "@/lib/client-image";

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
          options: parseOptionsText(form.options), freeShipping: form.freeShipping, shippingFee: form.shippingFee === "" ? null : Number(form.shippingFee)
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
    <main className="admin-content" style={{ maxWidth: 1080, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <div className="admin-page-head">
        <div><Link href="/admin/products">← Back to products</Link><h1>Add Product</h1><p>Build a complete product listing before publishing it to your storefront.</p></div>
      </div>

      {message && <p role="status" aria-live="polite" style={{ padding: 12, borderRadius: 9, background: "#fff7ed", color: "#9a3412", marginBottom: 16 }}>{message}</p>}

      <form onSubmit={submit}>
        <section style={cardStyle}>
          <div><h2 style={{ margin: 0, fontSize: 19 }}>1. Product information</h2><p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 14 }}>Name, SKU and description customers will see.</p></div>
          {textField("name", "Product name", { required: true, placeholder: "e.g. Premium Cotton T-Shirt" })}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
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

        <section style={cardStyle}>
          <div><h2 style={{ margin: 0, fontSize: 19 }}>2. Pricing (BDT)</h2><p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 14 }}>Set regular price and optional sale/compare price.</p></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
            {textField("price", "Regular price (৳)", { required: true, type: "number", min: "0", step: "0.01", placeholder: "e.g. 1200.00" })}
            {textField("compareAtPrice", "Compare-at price (৳)", { type: "number", min: "0", step: "0.01", placeholder: "Optional" })}
            {textField("salePrice", "Sale price (৳)", { type: "number", min: "0", step: "0.01", placeholder: "Optional; must not exceed regular price" })}
          </div>
          <p style={{ margin: 0, padding: 12, background: "#f9fafb", borderRadius: 9, color: "#4b5563", fontSize: 14 }}>Store currency: Bangladeshi Taka (৳). Leave optional prices empty if they do not apply.</p>
        </section>

        <section style={cardStyle}>
          <div><h2 style={{ margin: 0, fontSize: 19 }}>3. Inventory</h2><p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 14 }}>Control available stock and low-stock alerts.</p></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {textField("stock", "Available quantity", { required: true, type: "number", min: "0", step: "1" })}
            {textField("lowStockThreshold", "Low-stock threshold", { required: true, type: "number", min: "0", step: "1", help: "Used to identify products that need restocking." })}
          </div>
        </section>

        <section style={cardStyle}>
          <div><h2 style={{ margin: 0, fontSize: 19 }}>4. Product images</h2><p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 14 }}>Add one or more direct image URLs (HTTPS recommended). Images are saved after the product is created.</p></div>
          {images.map((image, index) => <div key={index} style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr) auto", gap: 10, alignItems: "end" }}>
            <label style={labelStyle}>Image URL {index + 1}
              <input style={fieldStyle} type="url" placeholder="https://example.com/product-image.webp" value={image.url} onChange={e => updateImage(index, "url", e.target.value)} />
            </label>
            <label style={labelStyle}>Alt text
              <input style={fieldStyle} placeholder={form.name || "Describe image"} value={image.alt} onChange={e => updateImage(index, "alt", e.target.value)} />
            </label>
            <button type="button" onClick={() => setImages(old => old.filter((_, i) => i !== index))} disabled={images.length === 1} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>Remove</button>
          </div>)}
          <label style={labelStyle}>Upload pictures from your device<input type="file" accept="image/*" multiple onChange={e => setFiles(Array.from(e.target.files || []))} style={fieldStyle} /></label>
          {files.length > 0 && <small style={{ color: "#6b7280" }}>{files.length} file(s) selected — compressed automatically and saved after the product is created.</small>}
          <div><button type="button" onClick={addImage} style={{ padding: "9px 13px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>+ Add another image</button></div>
          {validImages[0]?.url && <div style={{ display: "flex", gap: 12, alignItems: "center" }}><img src={validImages[0].url} alt="First product image preview" style={{ width: 86, height: 86, objectFit: "cover", borderRadius: 10, border: "1px solid #e5e7eb" }} onError={e => { e.currentTarget.style.display = "none"; }} /><small style={{ color: "#6b7280" }}>Preview of the first image URL</small></div>}
        </section>

        <section style={cardStyle}>
          <div><h2 style={{ margin: 0, fontSize: 19 }}>Options (size, colour…)</h2><p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 14 }}>One option per line, e.g. <code>Size: S, M, L</code>. Customers must choose each option. Stock is shared across all options.</p></div>
          <textarea rows={3} value={form.options} onChange={e => set("options", e.target.value)} style={fieldStyle} placeholder={"Size: S, M, L\nColor: Red, Blue"} />
        </section>

        <section style={cardStyle}>
          <div><h2 style={{ margin: 0, fontSize: 19 }}>Delivery</h2><p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 14 }}>Free delivery, or a custom delivery fee for this product. Leave blank to use the area/default fee.</p></div>
          <label style={{ display: "flex", gap: 10, alignItems: "center" }}><input type="checkbox" checked={form.freeShipping} onChange={e => set("freeShipping", e.target.checked)} /> Free delivery for this product</label>
          <label style={labelStyle}>Custom delivery fee (৳)<input type="number" min="0" step=".01" disabled={form.freeShipping} value={form.shippingFee} onChange={e => set("shippingFee", e.target.value)} style={fieldStyle} /></label>
        </section>

        <section style={cardStyle}>
          <div><h2 style={{ margin: 0, fontSize: 19 }}>5. Store visibility</h2><p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 14 }}>Choose how this product appears in the storefront.</p></div>
          <label style={{ display: "flex", gap: 10, alignItems: "center" }}><input type="checkbox" checked={form.featured} onChange={e => set("featured", e.target.checked)} /> Featured product</label>
          <label style={{ display: "flex", gap: 10, alignItems: "center" }}><input type="checkbox" checked={form.published} onChange={e => set("published", e.target.checked)} /> Publish immediately <small style={{ color: "#6b7280" }}>(otherwise save as draft)</small></label>
        </section>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end", paddingBottom: 32 }}>
          <Link href="/admin/products" style={{ padding: "12px 18px", border: "1px solid #d1d5db", borderRadius: 9, textDecoration: "none", color: "#374151", background: "#fff" }}>Cancel</Link>
          <button type="submit" disabled={busy} style={{ padding: "12px 20px", border: 0, borderRadius: 9, background: busy ? "#6b7280" : "#111827", color: "#fff", fontWeight: 700, cursor: busy ? "wait" : "pointer" }}>{busy ? "Creating product…" : form.published ? "Create & Publish Product →" : "Save Product as Draft →"}</button>
        </div>
      </form>
    </main>
  </div>;
}
