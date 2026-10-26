import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/firestore";
import {readAdminSession} from "@/lib/auth/admin";

export async function GET(req:NextRequest){
  const session=await readAdminSession(req.cookies.get("admin_session")?.value||"");
  if(!session)return NextResponse.json({error:"Admin authentication required."},{status:401});

  try{
    const orders=await db.order.findMany({
      include:{items:true,paymentGateway:{select:{id:true,name:true,type:true,mode:true,enabled:true}}},
      orderBy:{createdAt:"desc"},
      take:100
    });
    return NextResponse.json(orders.map(o=>({
      ...o,
      total:Number(o.total),
      subtotal:Number(o.subtotal),
      shippingFee:Number(o.shippingFee),
      discount:Number(o.discount),
      items:o.items.map(i=>({...i,unitPrice:Number(i.unitPrice),lineTotal:Number(i.lineTotal)})),
      gateway:o.paymentGateway?.name||null
    })),{headers:{"Cache-Control":"private, no-store, max-age=0"}});
  }catch(error){
    console.error("Admin orders list failed:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Unable to load orders."},{status:500});
  }
}
