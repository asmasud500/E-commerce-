import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";
import {recordAdminAudit} from "@/lib/auth/audit";

const schema=z.object({
  storeName:z.string().trim().min(1).max(120).optional(),
  supportEmail:z.string().trim().email().max(160).or(z.literal("")).optional(),
  supportPhone:z.string().trim().max(40).optional(),
  currency:z.enum(["BDT"]).optional(),
  defaultDeliveryFee:z.coerce.number().min(0).max(100000).optional(),
  freeShippingThreshold:z.coerce.number().min(0).max(10000000).nullable().optional(),
  taxEnabled:z.boolean().optional(),
  taxRate:z.coerce.number().min(0).max(100).optional(),
  announcement:z.string().trim().max(500).optional()
}).strict();

const defaults={id:"store",storeName:"MART Store",supportEmail:"",supportPhone:"",currency:"BDT",defaultDeliveryFee:120,freeShippingThreshold:3000,taxEnabled:false,taxRate:0,announcement:""};

export async function GET(){
  try{
    const row=await db.storeSetting.findUnique({where:{id:"store"}});
    return NextResponse.json({...defaults,...(row||{})});
  }catch(error){
    console.error("Admin store settings GET failed:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Unable to load store settings."},{status:500});
  }
}

export async function PUT(req:NextRequest){
  try{
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:"Invalid store settings.",details:parsed.error.flatten()},{status:400});
    const existing=await db.storeSetting.findUnique({where:{id:"store"}});
    const data={...parsed.data,updatedAt:new Date()};
    const row=existing
      ? await db.storeSetting.update({where:{id:"store"},data})
      : await db.storeSetting.create({data:{...defaults,...data,id:"store"}});
    await recordAdminAudit(req,{action:"STORE_SETTINGS_UPDATED",entity:"storeSetting",entityId:"store",metadata:{changedFields:Object.keys(parsed.data)}});
    return NextResponse.json({...defaults,...row});
  }catch(error){
    console.error("Admin store settings PUT failed:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Unable to save store settings."},{status:500});
  }
}
