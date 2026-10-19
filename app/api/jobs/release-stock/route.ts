import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {releaseOrderStockAtomically} from "@/lib/firestore";
export async function POST(req:NextRequest){
 const auth=req.headers.get("authorization"),secret=process.env.CRON_SECRET;
 if(!secret||auth!==`Bearer ${secret}`)return NextResponse.json({error:"Unauthorized"},{status:401});
 const expired=await db.stockReservation.findMany({where:{status:"HELD",expiresAt:{lt:new Date()}},select:{orderId:true}});
 const orderIds: string[]=[...new Set<string>(expired.map((r:any)=>String(r.orderId)))];let released=0;let cancelled=0;
 for(const orderId of orderIds){
  const result=await releaseOrderStockAtomically(orderId,new Date());
  released+=result.released;
  if(result.cancelled)cancelled++;
 }
 return NextResponse.json({ok:true,released,cancelled,orders:orderIds.length});
}