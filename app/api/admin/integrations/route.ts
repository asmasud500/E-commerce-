import {NextResponse} from "next/server";
import {publicIntegrations} from "@/lib/integrations/store";
export async function GET(){
  try{return NextResponse.json(await publicIntegrations(),{headers:{"Cache-Control":"no-store"}})}
  catch(e){console.error("Integrations GET failed:",e instanceof Error?e.message:String(e));return NextResponse.json({error:"Unable to load integrations."},{status:500})}
}
