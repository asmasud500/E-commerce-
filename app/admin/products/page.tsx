"use client";
import AdminSidebar from "@/components/AdminSidebar";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";

type P={id:string;name:string;sku:string;slug?:string;description?:string;price:number;compareAtPrice?:number|null;salePrice?:number|null;stock:number;lowStockThreshold?:number;featured?:boolean;published:boolean;categoryId?:string|null};
type ImportResult={row:number;sku:string;status:"created"|"updated"|"error";message:string};
const columns=["sku","name","slug","description","price","compareAtPrice","salePrice","stock","lowStockThreshold","featured","published","categoryId"];
const template="sku,name,slug,description,price,compareAtPrice,salePrice,stock,lowStockThreshold,featured,published,categoryId\nSKU-001,Sample Product,sample-product,Product description,1000,1200,,25,5,false,true,";
function csvCell(v:unknown){const s=v==null?"":String(v);return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function parseCSV(text:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}else if(c==='"')quoted=true;else if(c===","){row.push(cell);cell="";}else if(c==="\n"){row.push(cell.replace(/\r$/,""));if(row.some(v=>v.trim()))rows.push(row);row=[];cell="";}else cell+=c;}
 row.push(cell.replace(/\r$/,""));if(row.some(v=>v.trim()))rows.push(row);return rows;
}
function downloadCSV(name:string,content:string){const blob=new Blob(["\ufeff",content],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
function normalizeHeader(s:string){return s.trim().replace(/^\ufeff/,"").replace(/\s+/g,"").toLowerCase();}
export default function AdminProducts(){
 const [products,setProducts]=useState<P[]>([]);const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");const [query,setQuery]=useState("");const [visibility,setVisibility]=useState("ALL");const [stockFilter,setStockFilter]=useState("ALL");const [loading,setLoading]=useState(true);const [loadError,setLoadError]=useState("");const [results,setResults]=useState<ImportResult[]>([]);const [summary,setSummary]=useState<{created:number;updated:number;failed:number}|null>(null);const fileRef=useRef<HTMLInputElement>(null);
 async function load(){setLoading(true);setLoadError("");try{const r=await fetch("/api/admin/products",{cache:"no-store"});if(!r.ok)throw new Error("Product list could not be loaded.");const data=await r.json();setProducts(Array.isArray(data)?data:[]);}catch(e){setLoadError(e instanceof Error?e.message:"Could not load products.");}finally{setLoading(false);}}
 useEffect(()=>{load()},[]);
 async function toggle(p:P){const r=await fetch("/api/admin/products/"+p.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({published:!p.published})});if(!r.ok)alert("Could not update product status");load();}
 async function remove(id:string){if(!confirm("Delete this product?"))return;const r=await fetch("/api/admin/products/"+id,{method:"DELETE"});if(!r.ok)alert("Could not delete product");load();}
 function exportProducts(){const lines=[columns.join(","),...products.map(p=>columns.map(k=>csvCell((p as any)[k])).join(","))];downloadCSV("products-export.csv",lines.join("\r\n"));}
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
 <header className="admin-heading-row"><div><div className="admin-kicker">MART · CATALOG</div><Link href="/admin">← Dashboard</Link><h1>Products</h1><p>Manage catalog, pricing and inventory.</p></div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Link href="/admin/categories" style={{marginRight:4}}>Categories</Link><Link href="/admin/products/new" style={{background:"#111",color:"#fff",padding:"12px 18px",borderRadius:8}}>+ Add Product</Link></div></header>
 <section style={{border:"1px solid #d8dee8",borderRadius:12,padding:20,marginBottom:24,background:"#f8fafc"}}>
  <h2 style={{fontSize:20,margin:"0 0 8px"}}>Excel / Spreadsheet Bulk Import & Export</h2>
  <p style={{margin:"0 0 14px",color:"#475569"}}>Excel-এ CSV template খুলে একসঙ্গে অনেক product-এর SKU, price, stock, name ও status edit করুন। CSV format ব্যবহার করুন; এটি Microsoft Excel ও Google Sheets-এ খোলা যায়।</p>
  <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
   <button type="button" onClick={()=>downloadCSV("product-import-template.csv",template)} style={{padding:"10px 14px",borderRadius:8,border:"1px solid #cbd5e1",background:"#fff"}}>Download Template</button>
   <button type="button" onClick={exportProducts} style={{padding:"10px 14px",borderRadius:8,border:"1px solid #cbd5e1",background:"#fff"}}>Export Current Products</button>
   <button type="button" disabled={busy} onClick={()=>fileRef.current?.click()} style={{padding:"10px 14px",borderRadius:8,border:0,background:"#0f766e",color:"#fff",opacity:busy ? 0.65 : 1}}>{busy?"Importing…":"Choose CSV and Import"}</button>
   <input ref={fileRef} type="file" accept=".csv,text/csv" style={{display:"none"}} onChange={e=>importFile(e.target.files?.[0])}/>
  </div>
  <p style={{fontSize:13,color:"#475569",marginBottom:0}}>SKU দিয়ে existing product match হবে। Existing product-এর blank cell অপরিবর্তিত থাকবে; নতুন SKU যোগ করতে name ও price আবশ্যক। প্রতি import-এ সর্বোচ্চ 500 row। ভুল row আলাদা report-এ দেখাবে।</p>
  {notice&&<p role="status" style={{margin:"12px 0 0",fontWeight:600}}>{notice}</p>}
  {summary&&<div style={{display:"flex",gap:18,flexWrap:"wrap",marginTop:12}}><span>Created: <b>{summary.created}</b></span><span>Updated: <b>{summary.updated}</b></span><span>Failed: <b>{summary.failed}</b></span></div>}
  {results.length>0&&<div style={{overflowX:"auto",marginTop:12,maxHeight:260}}><table style={{width:"100%",background:"#fff",borderCollapse:"collapse"}}><thead><tr><th style={{textAlign:"left",padding:8}}>CSV row</th><th style={{textAlign:"left",padding:8}}>SKU</th><th style={{textAlign:"left",padding:8}}>Result</th><th style={{textAlign:"left",padding:8}}>Details</th></tr></thead><tbody>{results.filter(r=>r.status==="error").map((r,i)=><tr key={r.row+"-"+i}><td style={{padding:8}}>{r.row}</td><td style={{padding:8}}>{r.sku}</td><td style={{padding:8,color:"#b91c1c"}}>{r.status}</td><td style={{padding:8}}>{r.message}</td></tr>)}</tbody></table></div>}
 </section>
 <section className="catalog-metrics">
  <article><span>All products</span><strong>{products.length}</strong><small>Catalog records</small></article>
  <article><span>Published</span><strong>{products.filter(p=>p.published).length}</strong><small>Visible in storefront</small></article>
  <article><span>Low stock</span><strong>{products.filter(p=>p.stock>0&&p.stock<=(p.lowStockThreshold??5)).length}</strong><small>Restock recommended</small></article>
  <article><span>Out of stock</span><strong>{products.filter(p=>p.stock<=0).length}</strong><small>Unavailable quantity</small></article>
 </section>
 <section className="catalog-panel"><div className="catalog-panel-head"><div><h2>Product catalogue</h2><p>Search listings, review stock and manage publication status.</p></div><span className="catalog-count">{products.length} products</span></div>
  <div className="catalog-toolbar"><label className="catalog-search"><span>⌕</span><input aria-label="Search products" placeholder="Search product name, SKU or category…" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Filter product publication" value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="ALL">All visibility</option><option value="PUBLISHED">Published</option><option value="DRAFT">Drafts</option></select><select aria-label="Filter product stock" value={stockFilter} onChange={e=>setStockFilter(e.target.value)}><option value="ALL">All stock levels</option><option value="LOW">Low stock</option><option value="OUT">Out of stock</option><option value="HEALTHY">In stock</option></select><button type="button" onClick={()=>{setQuery("");setVisibility("ALL");setStockFilter("ALL")}}>Reset</button></div>
  {loadError&&<div className="catalog-error" role="alert">{loadError}<button onClick={load}>Retry</button></div>}
  <div className="catalog-table-wrap"><table className="catalog-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Inventory</th><th>Store status</th><th>Actions</th></tr></thead><tbody>
  {products.filter(p=>[p.name,p.sku,p.categoryId||"",p.slug||""].some(v=>v.toLowerCase().includes(query.toLowerCase().trim()))&&(visibility==="ALL"||(visibility==="PUBLISHED"?p.published:!p.published))&&(stockFilter==="ALL"||(stockFilter==="OUT"?p.stock<=0:stockFilter==="LOW"?p.stock>0&&p.stock<=(p.lowStockThreshold??5):p.stock>(p.lowStockThreshold??5)))).map(p=><tr key={p.id}><td><div className="catalog-product-name">{p.name}</div><small className="catalog-sku">{p.sku}</small></td><td>{p.categoryId||"Uncategorized"}</td><td><strong>৳{Number(p.salePrice??p.price).toLocaleString("en-BD")}</strong>{p.salePrice!=null&&<small className="catalog-muted"><s>৳{Number(p.price).toLocaleString("en-BD")}</s></small>}</td><td><strong>{p.stock}</strong><span className={"catalog-stock "+(p.stock<=0?"out":p.stock<=(p.lowStockThreshold??5)?"low":"healthy")}>{p.stock<=0?"Out of stock":p.stock<=(p.lowStockThreshold??5)?"Low stock":"In stock"}</span></td><td><span className={"catalog-published "+(p.published?"live":"draft")}>{p.published?"Published":"Draft"}</span>{p.featured&&<small className="catalog-muted">Featured</small>}</td><td><div className="catalog-actions"><Link href={"/admin/products/"+p.id}>Edit details</Link><button type="button" onClick={()=>toggle(p)}>{p.published?"Unpublish":"Publish"}</button><button type="button" className="danger" onClick={()=>remove(p.id)}>Delete</button></div></td></tr>)}
  </tbody></table>{loading&&<div className="catalog-empty">Loading catalogue…</div>}{!loading&&!loadError&&!products.filter(p=>[p.name,p.sku,p.categoryId||"",p.slug||""].some(v=>v.toLowerCase().includes(query.toLowerCase().trim()))&&(visibility==="ALL"||(visibility==="PUBLISHED"?p.published:!p.published))&&(stockFilter==="ALL"||(stockFilter==="OUT"?p.stock<=0:stockFilter==="LOW"?p.stock>0&&p.stock<=(p.lowStockThreshold??5):p.stock>(p.lowStockThreshold??5)))).length&&<div className="catalog-empty"><h3>No matching products</h3><p>Try changing the search or filters.</p></div>}</div>
 </section> </main></div>;
}
