import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/firestore";
import {z} from "zod";
import {recordAdminAudit} from "@/lib/auth/audit";

const schema=z.object({
  status:z.enum(["ACTIVE","PAUSED","CANCELLED"]).optional(),
  expiresAt:z.string().datetime().nullable().optional()
}).strict();
type Ctx={params:Promise<{id:string}>};

export async function PATCH(req:NextRequest,ctx:Ctx){
  try{
    const {id}=await ctx.params;
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:"Invalid gift card update."},{status:400});
    const current=await db.giftCard.findUnique({where:{id}});
    if(!current)return NextResponse.json({error:"Gift card not found."},{status:404});
    if(current.status==="CANCELLED"&&parsed.data.status==="ACTIVE")return NextResponse.json({error:"Cancelled gift cards cannot be reactivated."},{status:409});
    const row=await db.giftCard.update({where:{id},data:{
      ...(parsed.data.status?{status:parsed.data.status}:{}),
      ...(parsed.data.expiresAt!==undefined?{expiresAt:parsed.data.expiresAt?new Date(parsed.data.expiresAt):null}:{})
    }});
    await recordAdminAudit(req,{action:"GIFT_CARD_UPDATED",entity:"giftCard",entityId:id,metadata:{status:row.status}});
    return NextResponse.json({...row,initialBalance:Number(row.initialBalance||0),balance:Number(row.balance||0)});
  }catch(error){
    console.error("Gift card update failed:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Could not update gift card."},{status:400});
  }
}
