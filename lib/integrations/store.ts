import {db} from "@/lib/prisma";
import {encryptSecrets,decryptSecrets} from "@/lib/security/gateway-secrets";
import {providerById} from "./providers";

export type Integration={enabled:boolean;config:Record<string,string>;secrets:Record<string,string>};

export async function loadIntegration(id:string):Promise<Integration|null>{
  const row:any=await db.integration.findUnique({where:{id}}).catch(()=>null);
  if(!row)return null;
  let secrets:Record<string,string>={};
  try{if(row.encryptedSecrets)secrets=decryptSecrets(row.encryptedSecrets) as Record<string,string>}catch{}
  return {enabled:row.enabled===true,config:(row.config||{}) as Record<string,string>,secrets};
}

/** Admin view: never contains secret values, only whether each one is set. */
export async function publicIntegrations(){
  const out:any[]=[];
  for(const key of ["steadfast","pathao","sms"]){
    const def=providerById(key)!;const i=await loadIntegration(key);
    out.push({id:key,name:def.name,kind:def.kind,help:def.help,enabled:!!i?.enabled,config:i?.config||{},secretsSet:Object.fromEntries(def.secrets.map(s=>[s.key,!!i?.secrets?.[s.key]]))});
  }
  return out;
}

export async function saveIntegration(id:string,patch:{enabled?:boolean;config?:Record<string,string>;secrets?:Record<string,string>}){
  const def=providerById(id);if(!def)throw new Error("Unknown provider");
  const cur=await loadIntegration(id);
  const config:Record<string,string>={...(cur?.config||{})};
  for(const f of def.config)if(patch.config&&f.key in patch.config)config[f.key]=String(patch.config[f.key]||"").trim().slice(0,300);
  const secrets:Record<string,string>={...(cur?.secrets||{})};
  for(const f of def.secrets){const v=patch.secrets?.[f.key];if(typeof v==="string"&&v.trim())secrets[f.key]=v.trim().slice(0,500)}
  const data={enabled:patch.enabled??cur?.enabled??false,config,encryptedSecrets:encryptSecrets(secrets),updatedAt:new Date()};
  if(cur)await db.integration.update({where:{id},data});else await db.integration.create({data:{id,...data,createdAt:new Date()}});
  return {secretKeysSet:Object.keys(secrets)};
}
