import {NextRequest,NextResponse} from "next/server";
import {sendSms} from "@/lib/integrations/sms";
export async function POST(req:NextRequest){
  const b=await req.json().catch(()=>null);const phone=String(b?.phone||"").trim();
  if(phone.replace(/\D/g,"").length<10)return NextResponse.json({error:"Enter a phone number."},{status:400});
  const r=await sendSms(phone,"Test SMS from your store. SMS notifications are working.");
  return NextResponse.json(r,{status:r.ok?200:400});
}
