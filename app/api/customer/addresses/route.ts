import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/firestore";
import {verifyCustomerToken} from "@/lib/auth/customer";

async function currentUser(req:NextRequest){
  const token=req.cookies.get("customer_session")?.value;
  const session=token?await verifyCustomerToken(token):null;
  return session?.userId||null;
}
const addressSchema=z.object({
  label:z.string().trim().min(1).max(40).default("Home"),
  recipientName:z.string().trim().min(2).max(100),
  phone:z.string().trim().min(6).max(30),
  email:z.string().trim().email().max(254).optional().or(z.literal("")),
  division:z.string().trim().max(80).default(""),
  district:z.string().trim().min(2).max(100),
  upazila:z.string().trim().max(100).default(""),
  postalCode:z.string().trim().max(20).default(""),
  locationDescription:z.string().trim().min(5).max(500),
  isDefault:z.boolean().optional().default(false)
});
export async function GET(req:NextRequest){
  const userId=await currentUser(req);if(!userId)return NextResponse.json({error:"Please sign in to manage saved addresses."},{status:401});
  const addresses=await db.customerAddress.findMany({where:{userId},orderBy:[{isDefault:"desc"},{updatedAt:"desc"}]});
  return NextResponse.json({addresses});
}
export async function POST(req:NextRequest){
  const userId=await currentUser(req);if(!userId)return NextResponse.json({error:"Please sign in to save addresses."},{status:401});
  const parsed=addressSchema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Please check the delivery information and try again."},{status:400});
  const data=parsed.data;
  const created=await db.$transaction(async tx=>{
    const existing=await tx.customerAddress.findFirst({where:{userId,phone:data.phone,division:data.division,district:data.district,upazila:data.upazila,postalCode:data.postalCode,locationDescription:data.locationDescription}});
    const count=await tx.customerAddress.count({where:{userId}});
    if(!existing&&count>=20)throw new Error("ADDRESS_LIMIT");
    if(data.isDefault||count===0)await tx.customerAddress.updateMany({where:{userId,isDefault:true},data:{isDefault:false}});
    const payload={...data,email:data.email||null,userId,isDefault:data.isDefault||count===0};
    return existing?tx.customerAddress.update({where:{id:existing.id},data:payload}):tx.customerAddress.create({data:payload});
  }).catch(e=>{if(e instanceof Error&&e.message==="ADDRESS_LIMIT")return null;throw e});
  if(!created)return NextResponse.json({error:"You can save up to 20 delivery addresses."},{status:409});
  return NextResponse.json({address:created},{status:201});
}