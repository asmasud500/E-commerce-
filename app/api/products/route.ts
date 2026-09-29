import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";

export async function GET(req:NextRequest){
  try{
    const params=req.nextUrl.searchParams;
    const q=params.get("q")?.trim()||"";
    const category=params.get("category")||"";
    const featured=params.get("featured")==="true";
    const page=Math.max(1,Number(params.get("page")||1));
    const limit=Math.min(50,Math.max(1,Number(params.get("limit")||20)));

    const categories=await db.category.findMany({orderBy:{name:"asc"}});
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

    const [allProducts,images]=await Promise.all([
      db.product.findMany({where,orderBy:[{featured:"desc"},{createdAt:"desc"}]}),
      db.productImage.findMany({orderBy:{sortOrder:"asc"}})
    ]);

    const imagesByProduct=new Map<string,any[]>();
    for(const image of images as any[]){
      const list=imagesByProduct.get(image.productId)||[];
      list.push(image);
      imagesByProduct.set(image.productId,list);
    }

    const hydrated=allProducts.map((p:any)=>({
      ...p,
      category:p.categoryId?categories.find((c:any)=>c.id===p.categoryId)||null:null,
      images:imagesByProduct.get(p.id)||[]
    }));
    const total=hydrated.length;
    const items=hydrated.slice((page-1)*limit,page*limit).map((p:any)=>({
      ...p,
      price:Number(p.price),
      compareAtPrice:p.compareAtPrice!=null?Number(p.compareAtPrice):null,
      salePrice:p.salePrice!=null?Number(p.salePrice):null
    }));

    return NextResponse.json({items,page,limit,total,pages:Math.ceil(total/limit)});
  }catch(error){
    console.error("Products API error:",error);
    return NextResponse.json({error:"Unable to load products."},{status:500});
  }
}
