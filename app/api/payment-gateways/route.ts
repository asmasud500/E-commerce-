import {NextResponse} from "next/server";
import {db} from "@/lib/prisma";
export async function GET(){
 const gateways=await db.paymentGateway.findMany({where:{enabled:true},orderBy:{sortOrder:"asc"},select:{id:true,name:true,type:true,mode:true,publicConfig:true,qrImageUrl:true,qrMerchantName:true}});
 return NextResponse.json(gateways);
}
