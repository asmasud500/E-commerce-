import {NextResponse} from "next/server";
import {db} from "@/lib/prisma";

/** Public checkout exposes only automatic merchant checkout and explicit COD. */
export async function GET(){
 const gateways=await db.paymentGateway.findMany({
  where:{enabled:true},
  orderBy:{sortOrder:"asc"},
  select:{id:true,name:true,type:true,mode:true,publicConfig:true,qrImageUrl:true,qrMerchantName:true}
 });
 const available=gateways.filter(g=>{
  const config=(g.publicConfig||{}) as Record<string,unknown>;
  return g.type==="SSLCOMMERZ"||config.cod===true;
 }).map(g=>{
  const config=(g.publicConfig||{}) as Record<string,unknown>;
  return {id:g.id,name:g.name,type:g.type,mode:g.mode,qrImageUrl:null,qrMerchantName:null,...(config.cod===true?{cod:true}:{})};
 });
 return NextResponse.json(available,{headers:{"Cache-Control":"no-store"}});
}
