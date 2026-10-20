import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {readAdminSession} from "@/lib/auth/admin";
import {bookCourier} from "@/lib/integrations/courier";
import {updateOrderAdminFieldsAtomically} from "@/lib/firestore";
import {recordAdminAudit} from "@/lib/auth/audit";

/** Books the parcel with Steadfast or Pathao and saves the tracking code. Order must be in Processing. */
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;
    const session=await readAdminSession(req.cookies.get("admin_session")?.value||"");
    if(!session)return NextResponse.json({error:"Admin authentication required."},{status:401});
    const b=await req.json().catch(()=>null);const provider=String(b?.provider||"");
    if(!["steadfast","pathao"].includes(provider))return NextResponse.json({error:"Choose a courier."},{status:400});
    const o:any=await db.order.findUnique({where:{id},include:{items:true}});
    if(!o)return NextResponse.json({error:"Order not found."},{status:404});
    if(o.status!=="PROCESSING")return NextResponse.json({error:"Move the order to Processing before booking a courier."},{status:409});
    if(o.trackingNumber)return NextResponse.json({error:"A courier is already booked for this order ("+(o.courierName||"")+" "+o.trackingNumber+")."},{status:409});
    const r=await bookCourier(o,provider);
    if(!r.ok)return NextResponse.json({error:r.error},{status:502});
    const u=await updateOrderAdminFieldsAtomically({orderId:id,actorId:session.staffId||session.email||null,courierName:r.courier,trackingNumber:r.trackingNumber});
    await recordAdminAudit(req,{action:"COURIER_BOOKED",entity:"Order",entityId:id,metadata:{courier:r.courier,trackingNumber:r.trackingNumber}});
    if(!u.updated)return NextResponse.json({error:"Booked ("+r.trackingNumber+") but saving failed — add the tracking manually."},{status:500});
    return NextResponse.json({ok:true,courier:r.courier,trackingNumber:r.trackingNumber});
  }catch(e){console.error("Courier booking failed:",e instanceof Error?e.message:String(e));return NextResponse.json({error:"Courier booking failed."},{status:500})}
}
