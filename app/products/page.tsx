import Link from "next/link";
import { db } from "@/lib/prisma";
import StoreHeader from "@/components/StoreHeader";
import StoreFooter from "@/components/StoreFooter";

export default async function ProductsPage({searchParams}:{searchParams:Promise<{q?:string;category?:string;featured?:string}>}) {
  const sp=await searchParams, q=sp.q?.trim()||"", category=sp.category||"", featured=sp.featured==="true";
  const [products,categories]=await Promise.all([
    db.product.findMany({where:{published:true,stock:{gt:0},...(q?{OR:[{name:{contains:q,mode:"insensitive"}},{description:{contains:q,mode:"insensitive"}},{sku:{contains:q,mode:"insensitive"}}]}:{}),...(category?{category:{slug:category}}:{}),...(featured?{featured:true}:{})},include:{category:true,images:{orderBy:{sortOrder:"asc"}}},orderBy:[{featured:"desc"},{createdAt:"desc"}]}),
    db.category.findMany({orderBy:{name:"asc"}})
  ]);
  return <>
    <StoreHeader />
    <main className="catalog-page">
      <div className="catalog-head"><div><span className="eyebrow">CATALOG</span><h1>Products</h1><p>Find products that fit your needs.</p></div><span className="catalog-count">{products.length} available</span></div>
      <form className="catalog-filters">
        <label className="search-field"><span aria-hidden="true">⌕</span><input name="q" defaultValue={q} placeholder="Search products..." aria-label="Search products" /></label>
        <select name="category" defaultValue={category} aria-label="Filter by category"><option value="">All categories</option>{categories.map(c=><option key={c.id} value={c.slug}>{c.name}</option>)}</select>
        <label className="featured-filter"><input type="checkbox" name="featured" value="true" defaultChecked={featured}/> Featured only</label>
        <button className="filter-button">Apply filters</button>
      </form>
      {products.length===0 ? <section className="empty-state"><div className="empty-icon">⌕</div><h2>No products found</h2><p>Try another search or category.</p><Link href="/products" className="primary-cta">Clear filters</Link></section> :
      <div className="product-grid">{products.map(p=>{const price=p.salePrice??p.price;return <article className="product-card" key={p.id}>
        <Link href={"/products/"+p.slug} className="product-media">{p.images[0]?<img src={p.images[0].url} alt={p.images[0].alt||p.name} loading="lazy" decoding="async"/>:<div className="image-placeholder">No image</div>}{p.salePrice&&<span className="sale-badge">SALE</span>}</Link>
        <div className="product-card-body"><small>{p.category?.name||"Product"}</small><h2><Link href={"/products/"+p.slug}>{p.name}</Link></h2><div className="product-card-price"><strong>৳{Number(price).toLocaleString("en-BD")}</strong>{p.salePrice&&<s>৳{Number(p.price).toLocaleString("en-BD")}</s>}</div><p>{p.description||"Premium quality product."}</p><Link href={"/products/"+p.slug} className="product-link">View details <span>→</span></Link></div>
      </article>})}</div>}
    </main><StoreFooter />
  </>;
}
