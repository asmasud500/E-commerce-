import Link from "next/link";
import {db} from "@/lib/prisma";
import StoreHeader from "@/components/StoreHeader";
import StoreFooter from "@/components/StoreFooter";

export default async function ProductsPage({searchParams}:{searchParams:Promise<{q?:string;category?:string;featured?:string}>}) {
  const sp=await searchParams;
  const q=sp.q?.trim()||"";
  const category=sp.category||"";
  const featured=sp.featured==="true";

  // Firestore compatibility layer performs relations in application code.
  // Fetch the three collections once to avoid an N+1 request explosion.
  const [categories,images]=await Promise.all([
    db.category.findMany({orderBy:{name:"asc"}}),
    db.productImage.findMany({orderBy:{sortOrder:"asc"}})
  ]);
  const selectedCategory=category?categories.find((c:any)=>c.slug===category):null;

  const where:any={
    published:true,
    stock:{gt:0},
    ...(q?{OR:[
      {name:{contains:q,mode:"insensitive"}},
      {description:{contains:q,mode:"insensitive"}},
      {sku:{contains:q,mode:"insensitive"}}
    ]}:{}),
    ...(category?{categoryId:selectedCategory?.id||"__no_such_category__"}:{}),
    ...(featured?{featured:true}:{})
  };

  const products=await db.product.findMany({
    where,
    orderBy:[{featured:"desc"},{createdAt:"desc"}]
  });

  const categoryById=new Map(categories.map((c:any)=>[c.id,c]));
  const imagesByProduct=new Map<string,any[]>();
  for(const image of images as any[]){
    const list=imagesByProduct.get(image.productId)||[];
    list.push(image);
    imagesByProduct.set(image.productId,list);
  }

  const hydratedProducts=products.map((p:any)=>({
    ...p,
    category: p.categoryId?categoryById.get(p.categoryId)||null:null,
    images: imagesByProduct.get(p.id)||[]
  }));

  return <>
    <StoreHeader />
    <main className="catalog-page">
      <div className="catalog-head"><div><span className="eyebrow">CATALOG</span><h1>Products</h1><p>Find products that fit your needs.</p></div><span className="catalog-count">{hydratedProducts.length} available</span></div>
      <form className="catalog-filters">
        <label className="search-field"><span aria-hidden="true">⌕</span><input name="q" defaultValue={q} placeholder="Search products..." aria-label="Search products" /></label>
        <select name="category" defaultValue={category} aria-label="Filter by category"><option value="">All categories</option>{categories.map((c:any)=><option key={c.id} value={c.slug}>{c.name}</option>)}</select>
        <label className="featured-filter"><input type="checkbox" name="featured" value="true" defaultChecked={featured}/> Featured only</label>
        <button className="filter-button">Apply filters</button>
      </form>
      {hydratedProducts.length===0 ? <section className="empty-state"><div className="empty-icon">⌕</div><h2>No products found</h2><p>Try another search or category.</p><Link href="/products" className="primary-cta">Clear filters</Link></section> :
      <div className="product-grid">{hydratedProducts.map((p:any)=>{const price=p.salePrice??p.price;return <article className="product-card" key={p.id}>
        <Link href={"/products/"+p.slug} className="product-media">{p.images[0]?<img src={p.images[0].url} alt={p.images[0].alt||p.name} loading="lazy" decoding="async"/>:<div className="image-placeholder">No image</div>}{p.salePrice&&<span className="sale-badge">SALE</span>}</Link>
        <div className="product-card-body"><small>{p.category?.name||"Product"}</small><h2><Link href={"/products/"+p.slug}>{p.name}</Link></h2><div className="product-card-price"><strong>৳{Number(price).toLocaleString("en-BD")}</strong>{p.salePrice&&<s>৳{Number(p.price).toLocaleString("en-BD")}</s>}</div><p>{p.description||"Premium quality product."}</p><Link href={"/products/"+p.slug} className="product-link">View details <span>→</span></Link></div>
      </article>})}</div>}
    </main><StoreFooter />
  </>;
}
