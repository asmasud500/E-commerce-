import {NextResponse} from "next/server";
import {db} from "@/lib/prisma";

export async function GET(){
  try{
    const [stored,zones]=await Promise.all([
      db.storeSetting.findUnique({where:{id:"store"}}),
      db.deliveryZone.findMany({where:{active:true},orderBy:[{district:"asc"},{name:"asc"}]})
    ]);
    const settings={
      storeName:"MART Store",supportEmail:"",supportPhone:"",currency:"BDT",
      defaultDeliveryFee:60,freeShippingThreshold:null,taxEnabled:false,taxRate:0,announcement:"",
      ...(stored||{})
    };
    return NextResponse.json({settings,zones:zones.map((z:any)=>({
      id:z.id,name:z.name,district:z.district,fee:Number(z.fee||0),
      freeAbove:z.freeAbove==null?null:Number(z.freeAbove),estimatedDays:Number(z.estimatedDays||3)
    }))},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("Storefront config error:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Store configuration is temporarily unavailable."},{status:500});
  }
}