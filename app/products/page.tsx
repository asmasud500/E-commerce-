import Link from "next/link";
import {db} from "@/lib/prisma";
import StoreHeader from "@/components/StoreHeader";
import StoreFooter from "@/components/StoreFooter";
import {Icon} from "@/components/Icons";
import {ProductCard,type HomeProduct} from "@/components/home/ProductCard";
import {isFreeDelivery} from "@/lib/shipping";
import SmartSearchSuggestions from "@/components/SmartSearchSuggestions";

export const dynamic="force-dynamic";

const num=(v:any)=>v==null||v===""?null:Number(v);
const hasAvailableStock=(p:any)=>Array.isArray(p.variants)&&p.variants.length>0?p.variants.some((v:any)=>Number(v.stock)>0):Number(p.stock)>0;

export default async function ProductsPage({searchParams}:{searchParams:Promise<{q?:string;category?:string;featured?:string;sort?:string;delivery?:string}>}) {
  const sp=await searchParams;
  const q=sp.q?.trim()||"";
  const category=sp.category||"";
  const featured=sp.featured==="true";
  const freeOnly=sp.delivery==="free";
  const sort=["price_asc","price_desc","name_asc","name_desc","newest"].includes(sp.sort||"")?String(sp.sort):"";

  // Firestore compatibility layer performs relations in application code.
  // Fetch the collections once to avoid an N+1 request explosion.
  let categories:any[]=[],images:any[]=[],products:any[]=[],reviews:any[]=[],selectedCategory:any=null;
  try{
    [categories,images]=await Promise.all([
      db.category.findMany({orderBy:{name:"asc"}}),
      db.productImage.findMany({orderBy:{sortOrder:"asc"}})
    ]);
    selectedCategory=category?categories.find((c:any)=>c.slug===category):null;

    const where:any={
      published:true,
      ...(q?{OR:[
        {name:{contains:q,mode:"insensitive"}},
        {description:{contains:q,mode:"insensitive"}},
        {sku:{contains:q,mode:"insensitive"}}
      ]}:{}),
      ...(category?{categoryId:selectedCategory?.id||"__no_such_category__"}:{}),
      ...(featured?{featured:true}:{})
    };

    products=(await db.product.findMany({where,orderBy:[{featured:"desc"},{createdAt:"desc"}]})).filter(hasAvailableStock);
  }catch(error){
    console.error("Products page data error:",error instanceof Error?error.message:String(error));
  }
  // Ratings only decorate the cards, so a failure here must not break the page.
  try{reviews=await db.review.findMany({where:{approved:true}})}catch(error){console.error("Products reviews error:",error instanceof Error?error.message:String(error))}

  const catName=new Map<string,string>(categories.map((c:any)=>[c.id,c.name]));
  const firstImage=new Map<string,string>();
  for(const im of images as any[])if(im?.url&&!firstImage.has(im.productId))firstImage.set(im.productId,im.url);
  const rating=new Map<string,{sum:number;n:number}>();
  for(const r of reviews){const e=rating.get(r.productId)||{sum:0,n:0};e.sum+=Number(r.rating)||0;e.n+=1;rating.set(r.productId,e)}

  let list:HomeProduct[]=products.map((p:any)=>{
    const regular=Number(p.price);
    const sale=num(p.salePrice),compare=num(p.compareAtPrice);
    const variantPrices=Array.isArray(p.variants)?p.variants.filter((v:any)=>Number(v.stock)>0).map((v:any)=>Number(v.salePrice!=null&&Number(v.salePrice)<Number(v.price)?v.salePrice:v.price)).filter((n:number)=>Number.isFinite(n)&&n>=0):[];
    const price=variantPrices.length?Math.min(...variantPrices):(sale!=null&&sale>0&&sale<regular?sale:regular);
    const original=price<regular?regular:(compare&&compare>price?compare:null);
    const discount=original?Math.round((1-price/original)*100):0;
    const r=rating.get(p.id);
    return {
      id:p.id,slug:p.slug,name:p.name,sku:p.sku,stock:Number(p.stock),
      price,original:discount>0?original:null,discount,image:firstImage.get(p.id)||null,
      rating:r?r.sum/r.n:0,reviews:r?.n||0,sold:0,soldPct:0,
      categoryId:p.categoryId||null,category:p.categoryId?catName.get(p.categoryId)||null:null,
      freeDelivery:isFreeDelivery(p),hasVariants:(Array.isArray(p.variants)&&p.variants.length>0)||(Array.isArray(p.options)&&p.options.length>0)
    };
  });
  if(freeOnly)list=list.filter(p=>p.freeDelivery);
  const createdAtById=new Map<string,number>(products.map((p:any)=>[p.id,new Date(p.createdAt||0).getTime()]));
  if(sort==="price_asc")list=[...list].sort((a,b)=>a.price-b.price);
  if(sort==="price_desc")list=[...list].sort((a,b)=>b.price-a.price);
  if(sort==="name_asc")list=[...list].sort((a,b)=>a.name.localeCompare(b.name));
  if(sort==="name_desc")list=[...list].sort((a,b)=>b.name.localeCompare(a.name));
  if(sort==="newest")list=[...list].sort((a,b)=>(createdAtById.get(b.id)||0)-(createdAtById.get(a.id)||0));

  const href=(over:Record<string,string>)=>{
    const p=new URLSearchParams();
    const cur:Record<string,string>={q,category,featured:featured?"true":"",sort,delivery:freeOnly?"free":"",...over};
    for(const [k,v] of Object.entries(cur))if(v)p.set(k,v);
    const s=p.toString();return "/products"+(s?"?"+s:"");
  };
  const title=q?`Results for “${q}”`:selectedCategory?.name||"All products";

  return <>
    <StoreHeader categories={categories.map((c:any)=>({name:c.name,slug:c.slug}))}/>
    <main className="pg">
      <nav className="pg-crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevronRight" size={14}/>{selectedCategory||q?<><Link href="/products">Products</Link><Icon name="chevronRight" size={14}/><b>{title}</b></>:<b>Products</b>}</nav>
      <div className="pc-layout">
        <aside className="pg-card pc-side" aria-label="Filters">
          <h2>Categories</h2>
          <div className="pc-side-list">
            <Link href={href({category:""})} className={!category?"on":""}>All products</Link>
            {categories.map((c:any)=><Link key={c.id} href={href({category:c.slug})} className={category===c.slug?"on":""}>{c.name}</Link>)}
          </div>
          <div className="pc-side-foot">
            <Link href={href({featured:featured?"":"true"})} className={"pc-check"+(featured?" on":"")} aria-current={featured?"true":undefined}><span aria-hidden="true">{featured&&<Icon name="check" size={14}/>}</span>Featured only</Link>
            <Link href={href({delivery:freeOnly?"":"free"})} className={"pc-check"+(freeOnly?" on":"")} aria-current={freeOnly?"true":undefined}><span aria-hidden="true">{freeOnly&&<Icon name="check" size={14}/>}</span>Free delivery</Link>
          </div>
        </aside>
        <section aria-label="Product results">
          <div className="pg-head pc-catalog-head">
            <div>
              <span className="pc-eyebrow">DISCOVER YOUR NEXT FAVOURITE</span>
              <h1>{title}</h1>
              <p>Explore quality picks, compare prices and find the right product for you.</p>
            </div>
            <span className="pc-results-count"><strong>{list.length}</strong> {list.length===1?"product":"products"} found</span>
          </div>
          <form className="pc-tools" action="/products" method="get" role="search">
            {category&&<input type="hidden" name="category" value={category}/>}
            {featured&&<input type="hidden" name="featured" value="true"/>}
            {freeOnly&&<input type="hidden" name="delivery" value="free"/>}
            <label className="pc-search"><Icon name="search" size={18}/><input name="q" defaultValue={q} placeholder="Search products, brands and more" aria-label="Search products"/></label>
            <select name="sort" defaultValue={sort} aria-label="Sort products"><option value="">Featured first</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="name_asc">Name: A to Z</option><option value="name_desc">Name: Z to A</option><option value="newest">Newest arrivals</option></select>
            <button className="pg-btn" type="submit"><Icon name="search" size={16}/> Find products</button>
          </form>
          {q&&<SmartSearchSuggestions query={q}/>}
          {(q||category||featured||freeOnly||sort)&&<div className="pc-active-filters" aria-label="Active filters">
            <span>Active filters</span>
            {q&&<Link href={href({q:""})} className="pc-filter-chip">Search: {q} <b aria-hidden="true">×</b></Link>}
            {category&&<Link href={href({category:""})} className="pc-filter-chip">{selectedCategory?.name||"Category"} <b aria-hidden="true">×</b></Link>}
            {featured&&<Link href={href({featured:""})} className="pc-filter-chip">Featured <b aria-hidden="true">×</b></Link>}
            {freeOnly&&<Link href={href({delivery:""})} className="pc-filter-chip">Free delivery <b aria-hidden="true">×</b></Link>}
            {sort&&<Link href={href({sort:""})} className="pc-filter-chip">{sort==="price_asc"?"Price: low to high":sort==="price_desc"?"Price: high to low":sort==="name_asc"?"Name: A to Z":sort==="name_desc"?"Name: Z to A":"Newest arrivals"} <b aria-hidden="true">×</b></Link>}
            <Link href="/products" className="pc-clear-filters">Clear all</Link>
          </div>}
          {list.length===0
            ?<div className="pg-card pg-empty"><span className="pg-empty-ic"><Icon name="search" size={26}/></span><h2>No products found</h2><p>Try a different search or browse another category.</p><Link href="/products" className="pg-btn">Clear filters</Link></div>
            :<div className="pc-grid">{list.map(p=><ProductCard key={p.id} p={p}/>)}</div>}
        </section>
      </div>
    </main>
    <StoreFooter/>
  </>;
}
