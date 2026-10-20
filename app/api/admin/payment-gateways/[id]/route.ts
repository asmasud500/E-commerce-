import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {decryptSecrets,encryptSecrets} from "@/lib/security/gateway-secrets";
import {z} from "zod";
import {recordAdminAudit} from "@/lib/auth/audit";

const input=z.object({name:z.string().trim().min(1).max(100).optional(),type:z.enum(["SSLCOMMERZ","BKASH","NAGAD","ROCKET","UPAY","BANGLA_QR","CUSTOM"]).optional(),mode:z.enum(["SANDBOX","LIVE"]).optional(),enabled:z.boolean().optional(),sortOrder:z.coerce.number().int().optional(),apiBaseUrl:z.string().url().nullable().optional(),publicConfig:z.record(z.string(),z.unknown()).optional(),qrImageUrl:z.string().max(500).refine(v=>!v||/^https?:\/\//i.test(v)||/^\/api\/img\/[a-z0-9]+$/.test(v),{message:"Provide a valid image URL or uploaded image."}).nullable().optional(),qrMerchantName:z.string().max(200).nullable().optional(),secrets:z.record(z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/),z.string().max(10000)).refine(v=>Object.keys(v).length<=30,{message:"Too many credential fields"}).optional()});
const safe={id:true,name:true,type:true,mode:true,enabled:true,sortOrder:true,apiBaseUrl:true,publicConfig:true,qrImageUrl:true,qrMerchantName:true,createdAt:true,updatedAt:true} as const;

export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 try{
  const b=input.parse(await req.json());
  const existing=await db.paymentGateway.findUnique({where:{id},select:{id:true,type:true,enabled:true,encryptedSecrets:true,publicConfig:true}});
  if(!existing)return NextResponse.json({error:"Gateway not found"},{status:404});
  const finalType=b.type||existing.type;
  const storedSecrets=existing.encryptedSecrets?decryptSecrets(existing.encryptedSecrets):{};
  const candidateSecrets=b.secrets||storedSecrets;
  const hasCredentials=!!(String(candidateSecrets.storeId||"").trim()&&String(candidateSecrets.storePassword||"").trim());
  const finalPublicConfig=(b.publicConfig??existing.publicConfig) as Record<string,unknown>|null;
  const isCashOnDelivery=finalType==="CUSTOM"&&finalPublicConfig?.cod===true;\n  if(b.enabled===true&&finalType!=="SSLCOMMERZ"&&!isCashOnDelivery)return NextResponse.json({error:"This provider has no verified automatic adapter yet. Keep it disabled until an approved automatic integration is implemented."},{status:409});
  if(b.enabled===true&&finalType==="SSLCOMMERZ"&&!hasCredentials)return NextResponse.json({error:"Store ID and Store Password are required before enabling SSLCOMMERZ."},{status:409});
  if(b.secrets&&finalType==="SSLCOMMERZ"&&(!String(b.secrets.storeId||"").trim()||!String(b.secrets.storePassword||"").trim()))return NextResponse.json({error:"Save both SSLCOMMERZ Store ID and Store Password together."},{status:400});
  const {secrets,...rest}=b;
  const data:any={...rest,...(secrets?{encryptedSecrets:encryptSecrets(secrets)}:{})};
  const g=await db.paymentGateway.update({where:{id},data,select:safe});
  await recordAdminAudit(req,{action:"PAYMENT_GATEWAY_UPDATED",entity:"paymentGateway",entityId:id,metadata:{changedFields:Object.keys(b).filter(k=>k!=="secrets"),secretsChanged:!!secrets,name:g.name,enabled:g.enabled,mode:g.mode}});
  return NextResponse.json(g);
 }catch{return NextResponse.json({error:"Invalid gateway update"},{status:400})}
}
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 try{
  const existing=await db.paymentGateway.findUnique({where:{id},select:{id:true,name:true,type:true,enabled:true}});
  if(!existing)return NextResponse.json({error:"Gateway not found"},{status:404});
  await db.paymentGateway.delete({where:{id}});
  await recordAdminAudit(req,{action:"PAYMENT_GATEWAY_DELETED",entity:"paymentGateway",entityId:id,metadata:{name:existing.name,type:existing.type,enabled:existing.enabled}});
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Gateway delete failed; it may be referenced by orders"},{status:400})}
}