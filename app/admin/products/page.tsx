"use client";
import AdminSidebar from "@/components/AdminSidebar";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";

type P={id:string;name:string;sku:string;slug?:string;description?:string;price:number;compareAtPrice?:number|null;salePrice?:number|null;stock:number;lowStockThreshold?:number;featured?:boolean;published:boolean;categoryId?:string|null;category?:{name:string}|null;images?:{url:string;alt?:string|null;sortOrder?:number}[];options?:{name:string;values:string[]}[];variants?:{id?:string;sku?:string;options:Record<string,string>;price:number;salePrice?:number|null;compareAtPrice?:number|null;stock:number;lowStockThreshold?:number}[];freeShipping?:boolean;shippingFee?:number|null};
type ImportResult={row:number;sku:string;status:"created"|"updated"|"error";message:string};
const columns=["sku","name","slug","description","price","compareAtPrice","salePrice","stock","lowStockThreshold","featured","published","categoryId","optionsJson","variantsJson","imagesJson","freeShipping","shippingFee"];
const template=[columns.join(","),[
 "SKU-001","Sample Product","sample-product","Product description",1000,1200,"",25,5,false,true,"",
 JSON.stringify([{name:"Color",values:["Black","White"]}]),
 JSON.stringify([{sku:"SKU-001-BLACK",options:{Color:"Black"},price:1000,stock:10,lowStockThreshold:2},{sku:"SKU-001-WHITE",options:{Color:"White"},price:1000,stock:15,lowStockThreshold:2}]),
 JSON.stringify([{url:"https://example.com/product-image.jpg",alt:"Sample Product",sortOrder:0}]),
 false,""
].map(csvCell).join(",")].join("\\r\\n");
function csvCell(v:unknown){const s=v==null?"":String(v);return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function parseCSV(text:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}else if(c==='"')quoted=true;else if(c===","){row.push(cell);cell="";}else if(c==="\n"){row.push(cell.replace(/\r$/,""));if(row.some(v=>v.trim()))rows.push(row);row=[];cell="";}else cell+=c;}
 row.push(cell.replace(/\r$/,""));if(row.some(v=>v.trim()))rows.push(row);return rows;
}
function downloadCSV(name:string,content:string){const blob=new Blob(["\ufeff",content],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
function normalizeHeader(s:string){return s.trim().replace(/^\ufeff/,"").replace(/\s+/g,"").toLowerCase();}
export default function AdminProducts(){
 const [products,setProducts]=useState<P[]>([]);const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");const [actionBusy,setActionBusy]=useState("");const [query,setQuery]=useState("");const [visibility,setVisibility]=useState("ALL");const [stockFilter,setStockFilter]=useState("ALL");const [loading,setLoading]=useState(true);const [loadError,setLoadError]=useState("");const [results,setResults]=useState<ImportResult[]>([]);const [summary,setSummary]=useState<{created:number;updated:number;failed:number}|null>(null);const fileRef=useRef<HTMLInputElement>(null);
 async function load(){setLoading(true);setLoadError("");try{const r=await fetch("/api/admin/products",{cache:"no-store"});if(!r.ok)throw new Error("Product list could not be loaded.");const data=await r.json();setProducts(Array.isArray(data)?data:[]);}catch(e){setLoadError(e instanceof Error?e.message:"Could not load products.");}finally{setLoading(false);}}
 useEffect(()=>{load()},[]);
 async function toggle(p:P){setActionBusy(p.id);setNotice("");try{const r=await fetch("/api/admin/products/"+p.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({published:!p.published})});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"Could not update product status.");setNotice(p.published?"Product moved to drafts.":"Product published successfully.");await load();}catch(e){setNotice(e instanceof Error?e.message:"Product status update failed.");}finally{setActionBusy("");}}
 async function remove(id:string){const product=products.find(p=>p.id===id);if(!confirm("Delete "+(product?.name||"this product")+"? This action cannot be undone."))return;setActionBusy(id);setNotice("");try{const r=await fetch("/api/admin/products/"+id,{method:"DELETE"});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"Could not delete product.");setNotice("Product deleted.");await load();}catch(e){setNotice(e instanceof Error?e.message:"Product deletion failed.");}finally{setActionBusy("");}}
 function exportProducts(){const lines=[columns.join(","),...products.map(p=>columns.map(k=>{const value=(p as any)[k];if(k==="optionsJson")return csvCell(JSON.stringify(p.options??[]));if(k==="variantsJson")return csvCell(JSON.stringify(p.variants??[]));if(k==="imagesJson")return csvCell(JSON.stringify((p.images||[]).map(i=>({url:i.url,alt:i.alt||"",sortOrder:i.sortOrder??0}))));return csvCell(value);}).join(","))];downloadCSV("mart-products-export.csv",lines.join("\r\n"));setNotice("Product export downloaded with variants and image URLs.");}
 const filteredProducts=products.filter(p=>[p.name,p.sku,p.category?.name||p.categoryId||"",p.slug||""].some(v=>v.toLowerCase().includes(query.toLowerCase().trim()))&&(visibility==="ALL"||(visibility==="PUBLISHED"?p.published:!p.published))&&(stockFilter==="ALL"||(stockFilter==="OUT"?p.stock<=0:stockFilter==="LOW"?p.stock>0&&p.stock<=(p.lowStockThreshold??5):p.stock>(p.lowStockThreshold??5))));
 async function importFile(file?:File){
  if(!file)return;setBusy(true);setNotice("");setResults([]);setSummary(null);
  try{
   const matrix=parseCSV(await file.text());if(matrix.length<2)throw new Error("File needs a header row and at least one product row.");
   const header=matrix[0].map(normalizeHeader);if(!header.includes("sku"))throw new Error("Required column missing: sku");
   const rows=matrix.slice(1).map(cells=>{const obj:Record<string,string>={};header.forEach((h,i)=>{if(columns.includes(h))obj[h]=cells[i]??"";});return obj;}).filter(r=>r.sku?.trim());
   if(!rows.length)throw new Error("No product rows with SKU were found.");
   if(rows.length>500)throw new Error("Import is limited to 500 products per file.");
   const response=await fetch("/api/admin/products/bulk",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rows})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||"Import failed.");
   setSummary({created:data.created,updated:data.updated,failed:data.failed});setResults(data.results||[]);setNotice("Import finished.");await load();
  }catch(e){setNotice(e instanceof Error?e.message:"Could not read this CSV file.");}
  finally{setBusy(false);if(fileRef.current)fileRef.current.value="";}
 }
 return <div className="admin-layout"><AdminSidebar/><main className="admin-content">
 <header className="admin-heading-row catalog-page-heading"><div><div className="admin-kicker">MART · CATALOGUE MANAGEMENT</div><Link href="/admin" className="catalog-back-link">← Dashboard</Link><h1>Products &amp; Catalogue</h1><p>Manage product listings, pricing, publishing and stock visibility from one workspace.</p></div><div className="catalog-header-actions"><Link href="/admin/categories">Categories</Link><Link href="/admin/inventory">Inventory</Link><Link href="/admin/products/new" className="catalog-add-product">＋ Add product</Link></div></header>
 <section className="catalog-import-panel">
  <div className="catalog-import-heading"><span className="catalog-import-icon">⇅</span><div><h2>Bulk import &amp; export</h2><p>Update products in batches using Excel or Google Sheets.</p></div></div>
  <p className="catalog-import-description">Download the complete CSV template, fill product data plus options, variants and image URLs, then import it back. CSV works with Microsoft Excel and Google Sheets.</p>
  <div className="catalog-import-actions">
   <button type="button" onClick={()=>downloadCSV("product-import-template.csv",template)} className="catalog-secondary-action">Download Template</button>
   <button type="button" onClick={exportProducts} className="catalog-secondary-action">Export Current Products</button>
   <button type="button" disabled={busy} onClick={()=>fileRef.current?.click()} className="catalog-import-action">{busy?"Importing…":"Choose CSV and Import"}</button>
   <input ref={fileRef} type="file" accept=".csv,text/csv" style={{display:"none"}} onChange={e=>importFile(e.target.files?.[0])}/>
  </div>
  <p className="catalog-import-help">Products match by SKU. Use JSON arrays in optionsJson, variantsJson and imagesJson cells; images must be reachable URLs. Blank fields on existing products stay unchanged. New products require name and price. Maximum 500 rows per import.</p>
  {notice&&<p className="catalog-notice" role="status">{notice}</p>}
  {summary&&<div style={{display:"flex",gap:18,flexWrap:"wrap",marginTop:12}}><span>Created: <b>{summary.created}</b></span><span>Updated: <b>{summary.updated}</b></span><span>Failed: <b>{summary.failed}</b></span></div>}
  {results.length>0&&<div className="catalog-import-results"><strong>Import row details</strong><div className="catalog-import-results-table"><table><thead><tr><th>CSV row</th><th>SKU</th><th>Result</th><th>Details</th></tr></thead><tbody>{results.map((r,i)=><tr key={r.row+"-"+i}><td>{r.row}</td><td>{r.sku||"—"}</td><td><span className={"catalog-import-status "+r.status}>{r.status}</span></td><td>{r.message}</td></tr>)}</tbody></table></div></div>}
 </section>

 <section className="catalog-metrics">
  <article><span>All products</span><strong>{products.length}</strong><small>Catalog records</small></article>
  <article><span>Published</span><strong>{products.filter(p=>p.published).length}</strong><small>Visible in storefront</small></article>
  <article><span>Low stock</span><strong>{products.filter(p=>p.stock>0&&p.stock<=(p.lowStockThreshold??5)).length}</strong><small>Restock recommended</small></article>
  <article><span>Out of stock</span><strong>{products.filter(p=>p.stock<=0).length}</strong><small>Unavailable quantity</small></article>
 </section>
 <section className="catalog-panel"><div className="catalog-panel-head"><div><h2>Product catalogue</h2><p>Search listings, review stock and manage publication status.</p></div><span className="catalog-count">{filteredProducts.length} of {products.length} products</span></div>
  <div className="catalog-toolbar"><label className="catalog-search"><span>⌕</span><input aria-label="Search products" placeholder="Search product name, SKU or category…" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Filter product publication" value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="ALL">All visibility</option><option value="PUBLISHED">Published</option><option value="DRAFT">Drafts</option></select><select aria-label="Filter product stock" value={stockFilter} onChange={e=>setStockFilter(e.target.value)}><option value="ALL">All stock levels</option><option value="LOW">Low stock</option><option value="OUT">Out of stock</option><option value="HEALTHY">In stock</option></select><button type="button" onClick={()=>{setQuery("");setVisibility("ALL");setStockFilter("ALL")}}>Reset filters</button></div>
  {loadError&&<div className="catalog-error" role="alert">{loadError}<button onClick={load}>Retry</button></div>}
  <div className="catalog-table-wrap"><table className="catalog-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Inventory</th><th>Store status</th><th>Actions</th></tr></thead><tbody>
  {filteredProducts.map(p=><tr key={p.id}><td><div className="catalog-product-name">{p.name}</div><small className="catalog-sku">{p.sku}</small></td><td>{p.category?.name||"Uncategorized"}</td><td><strong>৳{Number(p.salePrice??p.price).toLocaleString("en-BD")}</strong>{p.salePrice!=null&&<small className="catalog-muted"><s>৳{Number(p.price).toLocaleString("en-BD")}</s></small>}</td><td><strong>{p.stock}</strong><span className={"catalog-stock "+(p.stock<=0?"out":p.stock<=(p.lowStockThreshold??5)?"low":"healthy")}>{p.stock<=0?"Out of stock":p.stock<=(p.lowStockThreshold??5)?"Low stock":"In stock"}</span></td><td><span className={"catalog-published "+(p.published?"live":"draft")}>{p.published?"Published":"Draft"}</span>{p.featured&&<small className="catalog-muted">Featured</small>}</td><td><div className="catalog-actions"><Link href={"/admin/products/"+p.id}>Edit details</Link><button type="button" disabled={actionBusy===p.id} onClick={()=>toggle(p)}>{actionBusy===p.id?"Saving…":p.published?"Unpublish":"Publish"}</button><button type="button" className="danger" disabled={actionBusy===p.id} onClick={()=>remove(p.id)}>{actionBusy===p.id?"Working…":"Delete"}</button></div></td></tr>)}
  </tbody></table>{loading&&<div className="catalog-empty">Loading catalogue…</div>}{!loading&&!loadError&&!filteredProducts.length&&<div className="catalog-empty"><h3>No matching products</h3><p>Try changing the search or filters.</p></div>}</div>
 </section> </main></div>;
}
