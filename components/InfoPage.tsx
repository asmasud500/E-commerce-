import StoreHeader from "@/components/StoreHeader";
import StoreFooter from "@/components/StoreFooter";
import {db} from "@/lib/prisma";

export type StoreInfo={storeName:string;supportEmail:string;supportPhone:string;deliveryFee:number;freeOver:number|null;address:string;whatsapp:string;facebookUrl:string;instagramUrl:string;youtubeUrl:string;openingHours:string;contactIntro:string;aboutIntro:string;aboutBody:string;privacyContent:string;termsContent:string;returnsContent:string;shippingContent:string;supportEmailRaw?:string};
export async function loadStoreInfo():Promise<StoreInfo>{
  let s:any=null;try{s=await db.storeSetting.findUnique({where:{id:"store"}})}catch{}
  return {storeName:String(s?.storeName||"MART Store"),supportEmail:String(s?.supportEmail||""),supportPhone:String(s?.supportPhone||""),address:String(s?.address||""),whatsapp:String(s?.whatsapp||"").replace(/[^0-9]/g,""),facebookUrl:String(s?.facebookUrl||""),instagramUrl:String(s?.instagramUrl||""),youtubeUrl:String(s?.youtubeUrl||""),openingHours:String(s?.openingHours||""),contactIntro:String(s?.contactIntro||""),aboutIntro:String(s?.aboutIntro||""),aboutBody:String(s?.aboutBody||""),privacyContent:String(s?.privacyContent||""),termsContent:String(s?.termsContent||""),returnsContent:String(s?.returnsContent||""),shippingContent:String(s?.shippingContent||""),deliveryFee:Number(s?.defaultDeliveryFee??120),freeOver:s?.freeShippingThreshold==null?3000:Number(s.freeShippingThreshold)||null};
}
import PolicyBody,{fillPlaceholders} from "@/components/PolicyBody";
import {POLICY_DEFAULTS,POLICY_FIELD,POLICY_INTROS,POLICY_TITLES,type PolicyKey} from "@/lib/store/policy-content";
export async function PolicyPage({kind}:{kind:PolicyKey}){
  const s=await loadStoreInfo();
  const custom=String((s as any)[POLICY_FIELD[kind]]||"").trim();
  const vars={storeName:s.storeName,supportEmail:s.supportEmail||"our contact page",supportPhone:s.supportPhone,deliveryFee:tk(s.deliveryFee),freeOver:s.freeOver?", and it is free on orders above "+tk(s.freeOver):""};
  const body=fillPlaceholders(custom||POLICY_DEFAULTS[kind],vars);
  return <InfoPage title={POLICY_TITLES[kind]} intro={fillPlaceholders(POLICY_INTROS[kind],vars)}><PolicyBody text={body}/></InfoPage>;
}
export const tk=(n:number)=>"৳"+n.toLocaleString("en-BD");

export default function InfoPage({title,intro,children}:{title:string;intro?:string;children:React.ReactNode}){
  return <><StoreHeader/><main className="pg"><article className="pg-card info-page"><h1>{title}</h1>{intro&&<p className="info-intro">{intro}</p>}{children}</article></main><StoreFooter/></>;
}
