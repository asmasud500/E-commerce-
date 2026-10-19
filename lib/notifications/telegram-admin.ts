import {db} from "@/lib/prisma";

export const esc=(v:unknown)=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const tk=(n:unknown)=>"৳"+Number(n||0).toLocaleString("en-BD",{maximumFractionDigits:2});

export async function telegramApi(method:string,body:Record<string,unknown>){
  const token=process.env.TELEGRAM_BOT_TOKEN;
  if(!token)return null;
  const r=await fetch("https://api.telegram.org/bot"+token+"/"+method,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store"});
  return r.json().catch(()=>null);
}

export const mapLink=(lat:unknown,lng:unknown)=>{
  const a=Number(lat),b=Number(lng);
  return lat!=null&&lng!=null&&lat!==""&&lng!==""&&Number.isFinite(a)&&Number.isFinite(b)?"https://www.google.com/maps?q="+a+","+b:"";
};

/** Everything needed to pack and deliver an order, as Telegram HTML. */
export function orderDetailsText(o:any){
  const items=(o.items||[]).map((i:any)=>"• "+esc(i.name)+" × "+i.quantity+" = "+tk(i.lineTotal)).join("\n");
  const area=[o.shippingUpazila,o.shippingDistrict,o.shippingDivision].filter(Boolean).join(", ");
  const map=mapLink(o.shippingLatitude,o.shippingLongitude);
  const lines=[
    "Order: <code>"+esc(o.orderNumber)+"</code>","",
    "<b>👤 Customer</b>",esc(o.customerName),
    "📞 <code>"+esc(o.customerPhone)+"</code>",
    o.customerEmail?"✉️ "+esc(o.customerEmail):"","",
    "<b>📍 Delivery</b>",
    area?esc(area)+(o.shippingPostalCode?" · "+esc(o.shippingPostalCode):""):"",
    o.shippingLocationDescription?esc(o.shippingLocationDescription):"",
    esc(o.shippingAddress),
    map?"🗺 <a href=\""+map+"\">Open pinned location</a>":"","",
    "<b>🛍 Items</b>",items,"",
    "Subtotal: "+tk(o.subtotal),
    Number(o.discount)>0?"Voucher"+(o.couponCode?" ("+esc(o.couponCode)+")":"")+": −"+tk(o.discount):"",
    "Delivery: "+(Number(o.shippingFee)>0?tk(o.shippingFee):"Free"),
    Number(o.taxAmount)>0?"Tax: "+tk(o.taxAmount):"",
    "<b>Total: "+tk(o.total)+"</b>","",
    "<b>💳 Payment</b>",
    esc(o.paymentGateway?.name||o.paymentProvider||"—")+" · "+esc(o.paymentStatus),
    o.paymentReference?"Txn ID: <code>"+esc(o.paymentReference)+"</code>"+(o.paymentSenderLast4?" · sender …"+esc(o.paymentSenderLast4):""):"",
    o.courierName||o.trackingNumber?"\n<b>🚚 Courier</b>\n"+esc([o.courierName,o.trackingNumber].filter(Boolean).join(" · ")):"",
    "Status: <b>"+esc(o.status)+"</b>"
  ];
  return lines.filter((l,i,a)=>!(l===""&&(i===0||a[i-1]===""))).join("\n");
}

const statusRow=(id:string)=>[[{text:"⚙️ Processing",callback_data:"status:"+id+":PROCESSING"},{text:"🚚 Shipped",callback_data:"status:"+id+":SHIPPED"},{text:"📬 Delivered",callback_data:"status:"+id+":DELIVERED"}]];

export async function sendNewOrderTelegram(orderId:string){
  const chatId=process.env.TELEGRAM_CHAT_ID;if(!chatId)return;
  const o=await db.order.findUnique({where:{id:orderId},include:{items:true,paymentGateway:true}});if(!o)return;
  return telegramApi("sendMessage",{chat_id:chatId,text:"<b>🛒 New Order</b>\n"+orderDetailsText(o),parse_mode:"HTML",disable_web_page_preview:true,reply_markup:{inline_keyboard:[[{text:"💳 Confirm Payment",callback_data:"pay_confirm:"+o.id},{text:"❌ Reject Payment",callback_data:"pay_reject:"+o.id}],[{text:"👁 View Order",callback_data:"order_view:"+o.id}],[{text:"📦 Status",callback_data:"status_menu:"+o.id}]]}});
}

/** Sent whenever a payment becomes PAID, however it was confirmed (dashboard, Telegram, SMS or gateway). */
export async function sendPaidOrderTelegram(orderId:string,via:string){
  const chatId=process.env.TELEGRAM_CHAT_ID;if(!chatId)return;
  const o=await db.order.findUnique({where:{id:orderId},include:{items:true,paymentGateway:true}});if(!o)return;
  const res=await telegramApi("sendMessage",{chat_id:chatId,text:"<b>✅ Payment confirmed</b> · via "+esc(via)+"\n"+orderDetailsText(o),parse_mode:"HTML",disable_web_page_preview:true,reply_markup:{inline_keyboard:[...statusRow(o.id),[{text:"👁 View Order",callback_data:"order_view:"+o.id}]]}});
  const lat=Number(o.shippingLatitude),lng=Number(o.shippingLongitude);
  if(o.shippingLatitude!=null&&o.shippingLongitude!=null&&Number.isFinite(lat)&&Number.isFinite(lng)){
    await telegramApi("sendLocation",{chat_id:chatId,latitude:lat,longitude:lng});
  }
  return res;
}

export async function notifyStatus(orderId:string){
  const chatId=process.env.TELEGRAM_CHAT_ID;if(!chatId)return;
  const o=await db.order.findUnique({where:{id:orderId}});if(!o)return;
  const statusIcon:Record<string,string>={PENDING:"⏳",CONFIRMED:"✅",PROCESSING:"⚙️",SHIPPED:"🚚",DELIVERED:"📬",CANCELLED:"❌",RETURNED:"↩️"};
  const paymentIcon:Record<string,string>={PENDING:"⏳",PAID:"✅",FAILED:"❌",REFUNDED:"↩️"};\n  return telegramApi("sendMessage",{chat_id:chatId,text:"<b>📦 ORDER STATUS UPDATE</b>\n━━━━━━━━━━━━━━━━━━\n<b>Order ID</b>\n<code>"+esc(o.orderNumber)+"</code>\n\n<b>📍 Order Status</b>\n"+(statusIcon[o.status]||"🔹")+" <b>"+esc(o.status.replace(/_/g," "))+"</b>\n\n<b>💳 Payment Status</b>\n"+(paymentIcon[o.paymentStatus]||"🔹")+" <b>"+esc(o.paymentStatus.replace(/_/g," "))+"</b>\n\n<i>MART STORE · Automated Notification</i>",parse_mode:"HTML",disable_web_page_preview:true});
}

/** Warn the admin when a sale leaves a product at or below its low-stock threshold. */
export async function notifyLowStock(productIds:string[]){
  const chatId=process.env.TELEGRAM_CHAT_ID;if(!chatId)return;
  const low:string[]=[];
  for(const id of productIds){
    const p=await db.product.findUnique({where:{id}});
    if(p&&Number(p.stock)<=Number(p.lowStockThreshold??5))low.push("• "+esc(p.name)+" (<code>"+esc(p.sku)+"</code>) — "+Number(p.stock)+" left");
  }
  if(!low.length)return;
  return telegramApi("sendMessage",{chat_id:chatId,text:"<b>⚠️ Low stock</b>\n"+low.join("\n")+"\n\nRefill with <code>/addstock SKU QTY</code>",parse_mode:"HTML"});
}
