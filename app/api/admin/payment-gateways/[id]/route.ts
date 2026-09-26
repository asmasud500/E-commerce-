import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {encryptSecrets} from "@/lib/security/gateway-secrets";
const allowed=["name","type","mode","enabled","sortOrder","apiBaseUrl","publicConfig","qrImageUrl","qrMerchantName"] as const;
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;try{const body=await req.json();const data:Record<string,unknown>={};
 for(const k of allowed)if(k in body)data[k]=body[k];
 if("secrets" in body){if(!body.secrets||typeof body.secrets!=="object")return NextResponse.json({error:"Invalid secrets"},{status:400});data.encryptedSecrets=encryptSecrets(body.secrets)}
 const g=await db.paymentGateway.update({where:{id},data});return NextResponse.json({...g,encryptedSecrets:undefined});
 }catch{return NextResponse.json({error:"Gateway update failed"},{status:400})}
}
export async function DELETE(_:NextRequest,{params}:{params:Promise<{id:string}>}){const {id}=await params;try{await db.paymentGateway.delete({where:{id}});return NextResponse.json({ok:true})}catch{return NextResponse.json({error:"Gateway delete failed"},{status:400})}}
