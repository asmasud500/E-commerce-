import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";
import {recordAdminAudit} from "@/lib/auth/audit";

export const runtime = "nodejs";
const rowSchema = z.object({
  sku: z.string().trim().min(1).max(100),
  name: z.string().trim().max(200).optional(),
  slug: z.string().trim().max(200).optional(),
  description: z.string().max(5000).optional(),
  price: z.union([z.literal(""),z.coerce.number().nonnegative()]).optional(),
  compareAtPrice: z.union([z.coerce.number().nonnegative(),z.literal("")]).optional(),
  salePrice: z.union([z.coerce.number().nonnegative(),z.literal("")]).optional(),
  stock: z.union([z.literal(""),z.coerce.number().int().nonnegative()]).optional(),
  lowStockThreshold: z.union([z.coerce.number().int().nonnegative(),z.literal("")]).optional(),
  featured: z.union([z.boolean(),z.string()]).optional(),
  published: z.union([z.boolean(),z.string()]).optional(),
  categoryId: z.string().optional()
});
const slugify=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
function boolValue(v:unknown){return typeof v==="boolean"?v:["true","1","yes","y","published"].includes(String(v??"").trim().toLowerCase());}
export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    if(!Array.isArray(body?.rows)||body.rows.length===0)return NextResponse.json({error:"No product rows supplied."},{status:400});
    if(body.rows.length>500)return NextResponse.json({error:"Maximum 500 products per import."},{status:400});
    const results:{row:number;sku:string;status:"created"|"updated"|"error";message:string}[]=[];
    for(let i=0;i<body.rows.length;i++){
      const raw=body.rows[i]; const sku=String(raw?.sku??"").trim();
      try{
        const p=rowSchema.parse(raw);
        const existing=await db.product.findFirst({where:{sku:p.sku}});
        const data:any={};
        for(const key of ["name","description","price","stock","lowStockThreshold","categoryId"] as const) if(p[key]!==undefined&&p[key]!=="")data[key]=p[key];
        if(p.slug!==undefined&&p.slug!=="")data.slug=slugify(p.slug); else if(p.name)data.slug=slugify(p.name);
        if(p.compareAtPrice!==undefined)data.compareAtPrice=p.compareAtPrice===""?null:p.compareAtPrice;
        if(p.salePrice!==undefined)data.salePrice=p.salePrice===""?null:p.salePrice;
        if(p.featured!==undefined&&p.featured!=="")data.featured=boolValue(p.featured);
        if(p.published!==undefined&&p.published!=="")data.published=boolValue(p.published);
        if(existing){
          if(!Object.keys(data).length){results.push({row:i+2,sku,status:"error",message:"No fields to update"});continue;}
          const row=await db.product.update({where:{id:existing.id},data});
          await recordAdminAudit(req,{action:"PRODUCT_BULK_UPDATED",entity:"Product",entityId:row.id,metadata:{sku,changedFields:Object.keys(data),source:"spreadsheet"}});
          results.push({row:i+2,sku,status:"updated",message:"Product updated"});
        }else{
          if(!p.name||p.price===undefined||p.price===""){results.push({row:i+2,sku,status:"error",message:"New SKU requires name and price"});continue;}
          const row=await db.product.create({data:{name:p.name,slug:slugify(p.slug||p.name),sku,description:p.description||null,price:p.price,compareAtPrice:p.compareAtPrice===""||p.compareAtPrice===undefined?null:p.compareAtPrice,salePrice:p.salePrice===""||p.salePrice===undefined?null:p.salePrice,stock:p.stock===""||p.stock===undefined?0:p.stock,lowStockThreshold:p.lowStockThreshold===""||p.lowStockThreshold===undefined?5:p.lowStockThreshold,featured:boolValue(p.featured),published:boolValue(p.published),categoryId:p.categoryId||null}});
          await recordAdminAudit(req,{action:"PRODUCT_BULK_CREATED",entity:"Product",entityId:row.id,metadata:{sku,name:p.name,source:"spreadsheet"}});
          results.push({row:i+2,sku,status:"created",message:"Product created"});
        }
      }catch(e){results.push({row:i+2,sku,status:"error",message:e instanceof z.ZodError?"Invalid value or column format":String(e).toLowerCase().includes("duplicate")?"Duplicate SKU or slug":"Could not save this row"});}
    }
    return NextResponse.json({total:body.rows.length,created:results.filter(r=>r.status==="created").length,updated:results.filter(r=>r.status==="updated").length,failed:results.filter(r=>r.status==="error").length,results});
  }catch{return NextResponse.json({error:"Invalid import request."},{status:400});}
}
