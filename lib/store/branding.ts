import {db} from "@/lib/prisma";

export type Branding={storeName:string;tagline:string;brandColor:string;accentColor:string;address:string;whatsapp:string;facebookUrl:string;supportEmail:string;supportPhone:string};
export const BRAND_DEFAULTS:Branding={storeName:"MART Store",tagline:"Quality products, simple shopping.",brandColor:"#131921",accentColor:"#ff6801",address:"",whatsapp:"",facebookUrl:"",supportEmail:"",supportPhone:""};
const HEX=/^#[0-9a-fA-F]{6}$/;
export const safeHex=(v:unknown,fallback:string)=>typeof v==="string"&&HEX.test(v.trim())?v.trim().toLowerCase():fallback;
function mix(hex:string,amount:number){const n=parseInt(hex.slice(1),16);const c=[(n>>16)&255,(n>>8)&255,n&255].map(x=>Math.max(0,Math.min(255,Math.round(x+(amount<0?x*amount:(255-x)*amount)))));return "#"+c.map(x=>x.toString(16).padStart(2,"0")).join("");}
export async function loadBranding():Promise<Branding>{
  let s:any=null;try{s=await db.storeSetting.findUnique({where:{id:"store"}})}catch(error){console.error("Branding load error:",error instanceof Error?error.message:String(error))}
  const str=(v:unknown,d:string)=>typeof v==="string"&&v.trim()?v.trim():d;
  return {storeName:str(s?.storeName,BRAND_DEFAULTS.storeName),tagline:str(s?.tagline,BRAND_DEFAULTS.tagline),brandColor:safeHex(s?.brandColor,BRAND_DEFAULTS.brandColor),accentColor:safeHex(s?.accentColor,BRAND_DEFAULTS.accentColor),address:str(s?.address,""),whatsapp:str(s?.whatsapp,""),facebookUrl:str(s?.facebookUrl,""),supportEmail:str(s?.supportEmail,""),supportPhone:str(s?.supportPhone,"")};
}
export function brandCss(b:Branding){
  const accent=b.accentColor,dark=mix(accent,-.14),soft=mix(accent,.9),navy=b.brandColor,navy2=mix(navy,.12);
  const rgb=(h:string)=>{const n=parseInt(h.slice(1),16);return `${(n>>16)&255},${(n>>8)&255},${n&255}`};
  return `:root{--brand:${navy};--navy:${navy};--navy-2:${navy2};--accent:${accent};--accent-2:${dark};--or:${accent};--or-d:${dark};--or-soft:${soft};--accent-rgb:${rgb(accent)}}input:focus,select:focus,textarea:focus{box-shadow:0 0 0 4px rgba(${rgb(accent)},.12)}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline-color:rgba(${rgb(accent)},.35)}`;
}
