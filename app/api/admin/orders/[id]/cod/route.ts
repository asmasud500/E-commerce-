import {NextRequest,NextResponse} from "next/server";
import {readAdminSession} from "@/lib/auth/admin";
import {collectCodPaymentAtomically} from "@/lib/firestore";

/** Mark the cash for a delivered Cash on Delivery order as collected. */
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;
    const session=await readAdminSession(req.cookies.get("admin_session")?.value||"");
    if(!session)return NextResponse.json({error:"Admin authentication required."},{status:401});
    const r=await collectCodPaymentAtomically(id,session.staffId||session.email||null);
    if(!r.ok)return NextResponse.json({error:"Only delivered, unpaid Cash on Delivery orders can be marked collected."},{status:409});
    return NextResponse.json({ok:true,paymentStatus:"PAID"});
  }catch(e){console.error("COD collect failed:",e instanceof Error?e.message:String(e));return NextResponse.json({error:"Update failed."},{status:400})}
}
