import {loadIntegration} from "./store";

export type BookResult={ok:true;courier:string;trackingNumber:string}|{ok:false;error:string};
const clean=(s:unknown,n:number)=>String(s??"").replace(/\s+/g," ").trim().slice(0,n);
const bdPhone=(p:string)=>{const d=String(p||"").replace(/\D+/g,"");return d.startsWith("880")?"0"+d.slice(3):d.startsWith("0")?d:"0"+d};

export const enabledCouriers=async()=>{const out:string[]=[];for(const id of ["steadfast","pathao"]){const i=await loadIntegration(id);if(i?.enabled)out.push(id)}return out};

/** Books a parcel with the chosen courier. COD amount is the full total for unpaid orders, otherwise 0. */
export async function bookCourier(order:any,provider:string):Promise<BookResult>{
  const i=await loadIntegration(provider);
  if(!i?.enabled)return {ok:false,error:provider+" is not enabled"};
  const cod=order.paymentStatus==="PAID"?0:Number(order.total||0);
  const address=clean([order.shippingAddress].filter(Boolean).join(", "),250);
  try{
    if(provider==="steadfast"){
      if(!i.secrets.apiKey||!i.secrets.secretKey)return {ok:false,error:"Steadfast keys are missing"};
      const base=(i.config.baseUrl||"https://portal.packzy.com/api/v1").replace(/\/+$/,"");
      const r=await fetch(base+"/create_order",{method:"POST",headers:{"Content-Type":"application/json","Api-Key":i.secrets.apiKey,"Secret-Key":i.secrets.secretKey},body:JSON.stringify({invoice:order.orderNumber,recipient_name:clean(order.customerName,100),recipient_phone:bdPhone(order.customerPhone),recipient_address:address,cod_amount:cod,note:"Order "+order.orderNumber})});
      const j:any=await r.json().catch(()=>null);
      const c=j?.consignment;
      if(!r.ok||!c)return {ok:false,error:"Steadfast: "+clean(j?.message||j?.errors&&JSON.stringify(j.errors)||r.status,150)};
      return {ok:true,courier:"Steadfast",trackingNumber:String(c.tracking_code||c.consignment_id)};
    }
    if(provider==="pathao"){
      const s=i.secrets;if(!s.clientId||!s.clientSecret||!s.username||!s.password||!i.config.storeId)return {ok:false,error:"Pathao credentials or store ID are missing"};
      const base=(i.config.baseUrl||"https://api-hermes.pathao.com").replace(/\/+$/,"");
      const tr=await fetch(base+"/aladdin/api/v1/issue-token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({client_id:s.clientId,client_secret:s.clientSecret,username:s.username,password:s.password,grant_type:"password"})});
      const tj:any=await tr.json().catch(()=>null);
      if(!tr.ok||!tj?.access_token)return {ok:false,error:"Pathao login failed — check the credentials"};
      const qty=(order.items||[]).reduce((a:number,x:any)=>a+Number(x.quantity||1),0)||1;
      const r=await fetch(base+"/aladdin/api/v1/orders",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+tj.access_token},body:JSON.stringify({store_id:Number(i.config.storeId),merchant_order_id:order.orderNumber,recipient_name:clean(order.customerName,100),recipient_phone:bdPhone(order.customerPhone),recipient_address:address,delivery_type:48,item_type:2,item_quantity:qty,item_weight:0.5,amount_to_collect:cod,special_instruction:"Order "+order.orderNumber})});
      const j:any=await r.json().catch(()=>null);
      const id=j?.data?.consignment_id;
      if(!r.ok||!id)return {ok:false,error:"Pathao: "+clean(j?.message||j?.errors&&JSON.stringify(j.errors)||r.status,150)};
      return {ok:true,courier:"Pathao",trackingNumber:String(id)};
    }
    return {ok:false,error:"Unknown courier"};
  }catch(e){return {ok:false,error:"Courier request failed: "+(e instanceof Error?e.message:"unknown")}}
}
