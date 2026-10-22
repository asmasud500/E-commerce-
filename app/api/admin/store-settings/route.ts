import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";
import {recordAdminAudit} from "@/lib/auth/audit";

const schema=z.object({
  storeName:z.string().trim().min(1).max(120).optional(),
  logoUrl:z.string().trim().max(1000).refine(v=>v===""||/^https:\/\/[^\s]+$/.test(v),"Logo URL must be HTTPS.").optional(),
  supportEmail:z.string().trim().email().max(160).or(z.literal("")).optional(),
  supportPhone:z.string().trim().max(40).optional(),
  currency:z.enum(["BDT"]).optional(),
  defaultDeliveryFee:z.coerce.number().min(0).max(100000).optional(),
  freeShippingThreshold:z.coerce.number().min(0).max(10000000).nullable().optional(),
  taxEnabled:z.boolean().optional(),
  taxRate:z.coerce.number().min(0).max(100).optional(),
  announcement:z.string().trim().max(500).optional(),
  tagline:z.string().trim().max(160).optional(),
  brandColor:z.string().trim().regex(/^#[0-9a-fA-F]{6}$/,"Use a hex colour like #131921").optional(),
  accentColor:z.string().trim().regex(/^#[0-9a-fA-F]{6}$/,"Use a hex colour like #ff6801").optional(),
  address:z.string().trim().max(300).optional(),
  whatsapp:z.string().trim().max(40).optional(),
  facebookUrl:z.string().trim().max(300).refine(v=>v===""||/^https:\/\/[^\s]+$/.test(v),"Facebook link must start with https://").optional(),
  instagramUrl:z.string().trim().max(300).refine(v=>v===""||/^https:\/\/[^\s]+$/.test(v),"Instagram link must start with https://").optional(),
  youtubeUrl:z.string().trim().max(300).refine(v=>v===""||/^https:\/\/[^\s]+$/.test(v),"YouTube link must start with https://").optional(),
  openingHours:z.string().trim().max(200).optional(),
  contactIntro:z.string().trim().max(300).optional(),
  aboutIntro:z.string().trim().max(300).optional(),
  aboutBody:z.string().trim().max(5000).optional(),
  footerNote:z.string().trim().max(200).optional(),
  copyrightText:z.string().trim().max(200).optional(),
  privacyContent:z.string().max(10000).optional(),
  termsContent:z.string().max(10000).optional(),
  returnsContent:z.string().max(10000).optional(),
  shippingContent:z.string().max(10000).optional()
}).strip();

const defaults={id:"store",storeName:"MART Store",logoUrl:"",supportEmail:"",supportPhone:"",currency:"BDT",defaultDeliveryFee:120,freeShippingThreshold:3000,taxEnabled:false,taxRate:0,announcement:"",tagline:"Quality products, simple shopping.",brandColor:"#131921",accentColor:"#ff6801",address:"",whatsapp:"",facebookUrl:"",instagramUrl:"",youtubeUrl:"",openingHours:"",contactIntro:"",aboutIntro:"",aboutBody:"",footerNote:"",copyrightText:"",privacyContent:"",termsContent:"",returnsContent:"",shippingContent:""};

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
