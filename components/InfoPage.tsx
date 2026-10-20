import StoreHeader from "@/components/StoreHeader";
import StoreFooter from "@/components/StoreFooter";
import {db} from "@/lib/prisma";

export type StoreInfo={storeName:string;supportEmail:string;supportPhone:string;deliveryFee:number;freeOver:number|null};
export async function loadStoreInfo():Promise<StoreInfo>{
  let s:any=null;try{s=await db.storeSetting.findUnique({where:{id:"store"}})}catch{}
  return {storeName:String(s?.storeName||"MART Store"),supportEmail:String(s?.supportEmail||""),supportPhone:String(s?.supportPhone||""),deliveryFee:Number(s?.defaultDeliveryFee??120),freeOver:s?.freeShippingThreshold==null?3000:Number(s.freeShippingThreshold)||null};
}
export const tk=(n:number)=>"৳"+n.toLocaleString("en-BD");

export default function InfoPage({title,intro,children}:{title:string;intro?:string;children:React.ReactNode}){
  return <><StoreHeader/><main className="pg"><article className="pg-card info-page"><h1>{title}</h1>{intro&&<p className="info-intro">{intro}</p>}{children}</article></main><StoreFooter/></>;
}
