import {NextRequest,NextResponse} from "next/server";
import {readAdminSession} from "@/lib/auth/admin";
import {db} from "@/lib/prisma";
import {z} from "zod";
import {encryptSecrets} from "@/lib/security/gateway-secrets";
import {recordAdminAudit} from "@/lib/auth/audit";

const schema=z.object({name:z.string().min(2),type:z.enum(["SSLCOMMERZ","BKASH","NAGAD","ROCKET","UPAY","BANGLA_QR","CUSTOM"]),mode:z.enum(["SANDBOX","LIVE"]).default("SANDBOX"),enabled:z.boolean().default(false),sortOrder:z.number().int().default(0),apiBaseUrl:z.string().url().optional().or(z.literal("")),publicConfig:z.record(z.string(),z.any()).optional(),secrets:z.record(z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/),z.string().max(10000)).refine(v=>Object.keys(v).length<=30,{message:"Too many credential fields"}).optional(),qrImageUrl:z.string().max(500).refine(v=>!v||/^https?:\/\//i.test(v)||/^\/api\/img\/[a-z0-9]+$/.test(v),{message:"Provide a valid image URL or upload an image."}).optional(),qrMerchantName:z.string().optional()});
const safe={id:true,name:true,type:true,mode:true,enabled:true,sortOrder:true,apiBaseUrl:true,publicConfig:true,qrImageUrl:true,qrMerchantName:true,createdAt:true,updatedAt:true} as const;

export async function GET(req:NextRequest){const session=await readAdminSession(req.cookies.get("admin_session")?.value||"");if(!session)return NextResponse.json({error:"Admin authentication required."},{status:401,headers:{"Cache-Control":"no-store"}});return NextResponse.json(await db.paymentGateway.findMany({select:safe,orderBy:{sortOrder:"asc"}}),{headers:{"Cache-Control":"private, no-store, max-age=0"}})}
export async function POST(req:NextRequest){
 const session=await readAdminSession(req.cookies.get("admin_session")?.value||"");
 if(!session)return NextResponse.json({error:"Admin authentication required."},{status:401});
 try{
  const b=schema.parse(await req.json());
  if(b.enabled&&b.type!=="SSLCOMMERZ")return NextResponse.json({error:"This provider has no verified automatic adapter yet. Keep it disabled until an approved automatic integration is implemented."},{status:409});
  if(b.enabled&&b.type==="SSLCOMMERZ"&&(!String(b.secrets?.storeId||"").trim()||!String(b.secrets?.storePassword||"").trim()))return NextResponse.json({error:"Store ID and Store Password are required before enabling SSLCOMMERZ."},{status:409});
  if(b.secrets&&b.type==="SSLCOMMERZ"&&(!String(b.secrets.storeId||"").trim()||!String(b.secrets.storePassword||"").trim()))return NextResponse.json({error:"Save both SSLCOMMERZ Store ID and Store Password together."},{status:400});
  const data:any={name:b.name,type:b.type,mode:b.mode,enabled:b.enabled,sortOrder:b.sortOrder,apiBaseUrl:b.apiBaseUrl||null,publicConfig:b.publicConfig||{},qrImageUrl:b.qrImageUrl||null,qrMerchantName:b.qrMerchantName||null};
  if(b.secrets)data.encryptedSecrets=encryptSecrets(b.secrets);
  const row=await db.paymentGateway.create({data,select:safe});
  await recordAdminAudit(req,{action:"PAYMENT_GATEWAY_CREATED",entity:"paymentGateway",entityId:row.id,metadata:{name:row.name,type:row.type,mode:row.mode,enabled:row.enabled}});
  return NextResponse.json(row,{status:201});
 }catch{return NextResponse.json({error:"Invalid gateway configuration"},{status:400})}
}