import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {saveIntegration} from "@/lib/integrations/store";
import {providerById} from "@/lib/integrations/providers";
import {recordAdminAudit} from "@/lib/auth/audit";

const schema=z.object({enabled:z.boolean().optional(),config:z.record(z.string(),z.string().max(300)).optional(),secrets:z.record(z.string(),z.string().max(500)).optional()}).strict();

/** Super-admin only (see permissions). Secrets are write-only: blank fields keep the stored value. */
export async function PUT(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;if(!providerById(id))return NextResponse.json({error:"Unknown provider."},{status:404});
    const p=schema.safeParse(await req.json().catch(()=>null));if(!p.success)return NextResponse.json({error:"Invalid settings."},{status:400});
    await saveIntegration(id,p.data);
    await recordAdminAudit(req,{action:"INTEGRATION_UPDATED",entity:"integration",entityId:id,metadata:{enabled:p.data.enabled,configKeys:Object.keys(p.data.config||{}),secretKeysChanged:Object.entries(p.data.secrets||{}).filter(([,v])=>v&&v.trim()).map(([k])=>k)}});
    return NextResponse.json({ok:true});
  }catch(e){console.error("Integration save failed:",e instanceof Error?e.message:String(e));return NextResponse.json({error:"Could not save. Check that PAYMENT_ENCRYPTION_KEY is set on the server."},{status:500})}
}
