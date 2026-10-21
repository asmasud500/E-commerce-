import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";
import {verifyCustomerToken} from "@/lib/auth/customer";
async function userId(req:NextRequest){const token=req.cookies.get("customer_session")?.value;const session=token?await verifyCustomerToken(token):null;return session?.userId||null}
const schema=z.object({
 label:z.string().trim().min(1).max(40).optional(),
 recipientName:z.string().trim().min(2).max(100).optional(),
 phone:z.string().trim().min(6).max(30).optional(),
 email:z.string().trim().email().max(254).optional().or(z.literal("")),
 division:z.string().trim().max(80).optional(),
 district:z.string().trim().min(2).max(100).optional(),
 upazila:z.string().trim().max(100).optional(),
 postalCode:z.string().trim().max(20).optional(),
 locationDescription:z.string().trim().min(5).max(500).optional(),
 isDefault:z.boolean().optional()
});
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const uid=await userId(req);if(!uid)return NextResponse.json({error:"Please sign in to manage saved addresses."},{status:401});
 const {id}=await params;const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Please check the address information."},{status:400});
 const exists=await db.customerAddress.findFirst({where:{id,userId:uid}});if(!exists)return NextResponse.json({error:"Saved address not found."},{status:404});
 const data:any={...parsed.data};if(data.email==="")data.email=null;
 const address=await db.$transaction(async tx=>{
  if(data.isDefault===true)await tx.customerAddress.updateMany({where:{userId:uid,isDefault:true},data:{isDefault:false}});
  return tx.customerAddress.update({where:{id},data});
 });
 return NextResponse.json({address});
}
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const uid=await userId(req);if(!uid)return NextResponse.json({error:"Please sign in to manage saved addresses."},{status:401});
 const {id}=await params;const address=await db.customerAddress.findFirst({where:{id,userId:uid}});
 if(!address)return NextResponse.json({error:"Saved address not found."},{status:404});
 await db.customerAddress.delete({where:{id}});
 if(address.isDefault){const next=await db.customerAddress.findFirst({where:{userId:uid},orderBy:{updatedAt:"desc"}});if(next)await db.customerAddress.update({where:{id:next.id},data:{isDefault:true}})}
 return NextResponse.json({ok:true});
}