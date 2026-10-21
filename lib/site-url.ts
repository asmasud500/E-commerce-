import {headers} from "next/headers";

/** Public site origin: the configured URL if any, otherwise the host the request arrived on (never localhost in production). */
export async function getSiteUrl():Promise<string>{
  const configured=(process.env.NEXT_PUBLIC_SITE_URL||"").trim().replace(/\/+$/,"");
  if(configured)return configured;
  try{
    const h=await headers();
    const host=(h.get("x-forwarded-host")||h.get("host")||"").split(",")[0].trim();
    if(host&&/^[a-z0-9.\-:]+$/i.test(host)){
      const local=/^(localhost|127\.|0\.0\.0\.0)/.test(host);
      return (local?"http":"https")+"://"+host;
    }
  }catch{}
  return "http://localhost:3000";
}
