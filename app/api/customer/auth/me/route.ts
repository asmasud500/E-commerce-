import {NextRequest,NextResponse} from "next/server";import {db} from "@/lib/prisma";import {verifyCustomerToken} from "@/lib/auth/customer";import {z} from "zod";const profileSchema=z.object({name:z.string().trim().min(2).max(100).optional(),phone:z.string().trim().min(6).max(30).optional(),email:z.string().trim().email().max(254).optional()});
export async function PATCH(req:NextRequest){
 const token=req.cookies.get("customer_session")?.value;const session=token?await verifyCustomerToken(token):null;
 if(!session)return NextResponse.json({error:"Please sign in to update your profile."},{status:401});
 const parsed=profileSchema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Please check your profile information."},{status:400});
 try{
  const data:any={...parsed.data};if(data.email)data.email=data.email.toLowerCase();
  const user=await db.user.update({where:{id:session.userId},data,select:{id:true,name:true,email:true,phone:true}});
  return NextResponse.json({user});
 }catch{return NextResponse.json({error:"Could not update your profile."},{status:400})}
}
export async function GET(req:NextRequest){const token=req.cookies.get("customer_session")?.value;const session=token?await verifyCustomerToken(token):null;if(!session)return NextResponse.json({user:null});const user=await db.user.findUnique({where:{id:session.userId},select:{id:true,name:true,email:true,phone:true}});const adminEmail=(process.env.ADMIN_EMAIL||"").trim().toLowerCase();const isAdmin=!!user&&!!adminEmail&&String(user.email||"").trim().toLowerCase()===adminEmail;return NextResponse.json({user,isAdmin})}