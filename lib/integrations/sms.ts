import {orderSmsText} from "./sms-text";
export {orderSmsText};
import {loadIntegration} from "./store";

const bdPhone=(p:string)=>{let d=String(p||"").replace(/\D+/g,"");if(d.startsWith("880"))return d;if(d.startsWith("0"))d="88"+d;else d="880"+d;return d};

/** Sends one SMS through the configured provider. Never throws: SMS is a courtesy, not part of the order flow. */
export async function sendSms(phone:string,message:string):Promise<{ok:boolean;error?:string}>{
  try{
    const i=await loadIntegration("sms");
    if(!i?.enabled||!i.secrets.apiKey||!i.config.senderId)return {ok:false,error:"SMS is not configured"};
    const url="http://bulksmsbd.net/api/smsapi?"+new URLSearchParams({api_key:i.secrets.apiKey,type:"text",number:bdPhone(phone),senderid:i.config.senderId,message}).toString();
    const r=await fetch(url,{cache:"no-store"});
    const t=await r.text();
    if(!r.ok)return {ok:false,error:"SMS provider error "+r.status};
    const code=Number((()=>{try{return JSON.parse(t).response_code}catch{return NaN}})());
    return code===202||t.includes("202")?{ok:true}:{ok:false,error:"SMS provider rejected: "+t.slice(0,120)};
  }catch(e){return {ok:false,error:e instanceof Error?e.message:"SMS failed"}}
}


/** Texts the customer about the order's current status (no-op when SMS is off or the status has no message). */
export async function smsOrderStatus(orderId:string){
  try{
    const {db}=await import("@/lib/prisma");
    const o:any=await db.order.findUnique({where:{id:orderId}});if(!o?.customerPhone)return;
    const s:any=await db.storeSetting.findUnique({where:{id:"store"}}).catch(()=>null);
    const text=orderSmsText(o,s?.storeName||"MART Store");if(!text)return;
    await sendSms(o.customerPhone,text);
  }catch{}
}
