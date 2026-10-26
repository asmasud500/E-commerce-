import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/firestore";
import {z} from "zod";
import {recordAdminAudit} from "@/lib/auth/audit";

const createSchema=z.object({
  amount:z.coerce.number().finite().min(100).max(1000000),
  recipientName:z.string().trim().max(100).optional().default(""),
  recipientEmail:z.string().trim().email().max(254).optional().or(z.literal("")),
  recipientPhone:z.string().trim().max(30).optional().default(""),
  message:z.string().trim().max(300).optional().default(""),
  expiresAt:z.string().datetime().nullable().optional()
}).strict();

function makeCode(){
  const bytes=crypto.getRandomValues(new Uint8Array(18));
  const raw=Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("").toUpperCase();
  return "MART-"+raw.match(/.{1,6}/g)!.join("-");
}

export async function GET(){
  try{
    const rows=await db.giftCard.findMany({orderBy:{createdAt:"desc"},take:500});
    return NextResponse.json(rows.map((c:any)=>({...c,initialBalance:Number(c.initialBalance||0),balance:Number(c.balance||0)})),{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("Gift card list failed:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Could not load gift cards."},{status:500});
  }
}

export async function POST(req:NextRequest){
  try{
    const parsed=createSchema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:"Enter a valid amount (৳100–৳1,000,000) and valid recipient details."},{status:400});
    const b=parsed.data;
    let row:any=null;
    // Collision retry uses a fresh cryptographically random code; the code is never derived from recipient details.
    for(let attempt=0;attempt<3;attempt++){
      const code=makeCode();
      try{
        row=await db.giftCard.create({data:{
          code,initialBalance:b.amount,balance:b.amount,status:"ACTIVE",
          recipientName:b.recipientName||null,recipientEmail:b.recipientEmail||null,
          recipientPhone:b.recipientPhone||null,message:b.message||null,
          expiresAt:b.expiresAt?new Date(b.expiresAt):null,issuedAt:new Date()
        }});
        break;
      }catch(error){
        if(attempt===2)throw error;
      }
    }
    if(!row)throw new Error("Could not issue gift card");
    await db.giftCardTransaction.create({data:{
      giftCardId:row.id,type:"ISSUED",amount:b.amount,balanceAfter:b.amount,
      reference:"ISSUE-"+row.id,metadata:{source:"admin"},createdAt:new Date()
    }});
    await recordAdminAudit(req,{action:"GIFT_CARD_ISSUED",entity:"giftCard",entityId:row.id,metadata:{amount:b.amount,recipientEmail:b.recipientEmail||null}});
    return NextResponse.json({...row,initialBalance:Number(row.initialBalance),balance:Number(row.balance)}, {status:201});
  }catch(error){
    console.error("Gift card issue failed:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Gift card could not be issued. Please retry."},{status:400});
  }
}
