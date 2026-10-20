import {db} from "@/lib/prisma";
import {esc,telegramApi,orderDetailsText} from "@/lib/notifications/telegram-admin";
import {saveProductImage,MAX_IMAGE_BYTES} from "@/lib/store/images";
import {deliveryLabel} from "@/lib/shipping";

const tk=(n:unknown)=>"৳"+Number(n||0).toLocaleString("en-BD",{maximumFractionDigits:2});
const slugify=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"product";
async function audit(action:string,entity:string,entityId:string|null,metadata:Record<string,unknown>){
  try{await db.auditLog.create({data:{actorId:"telegram",action,entity,entityId,metadata,createdAt:new Date()}})}catch{}
}
export async function reply(text:string,extra:Record<string,unknown>={},messageId?:number){
  if(messageId){
    const body=text.length>3800?text.slice(0,3780)+"…\n<i>Output shortened to keep this task in one message.</i>":text;
    const edited=await telegramApi("editMessageText",{chat_id:process.env.TELEGRAM_CHAT_ID,message_id:messageId,text:body,parse_mode:"HTML",disable_web_page_preview:true,...extra});
    if(edited?.ok||String(edited?.description||"").toLowerCase().includes("message is not modified"))return edited;
    return edited;
  }
  const chunks:string[]=[];let cur="";
  for(const line of text.split("\n")){if((cur+line).length>3800){chunks.push(cur);cur=""}cur+=line+"\n"}
  if(cur.trim())chunks.push(cur);
  for(const c of chunks)await telegramApi("sendMessage",{chat_id:process.env.TELEGRAM_CHAT_ID,text:c,parse_mode:"HTML",disable_web_page_preview:true,...extra});
}
const findProduct=async(key:string)=>{
  const k=key.trim();if(!k)return null;
  return (await db.product.findFirst({where:{sku:k}}))||(await db.product.findFirst({where:{sku:k.toUpperCase()}}))||(await db.product.findFirst({where:{slug:k.toLowerCase()}}))||(await db.product.findUnique({where:{id:k}}).catch(()=>null));
};
const num=(s:string|undefined)=>{if(s==null||s.trim()==="")return NaN;return Number(s.replace(/[,৳]/g,""))};
const productLine=(p:any)=>"<code>"+esc(p.sku)+"</code> · "+esc(p.name)+" · "+tk(p.salePrice??p.price)+" · stock "+p.stock+(p.published?"":" · <i>draft</i>");

export const HELP=`<b>🤖 Store Admin Bot</b>
<b>Reports</b>: /report [days] (বিক্রি, অর্ডার, top product) · /returns · /return ID approve|reject|refunded
<b>Orders</b>: /orders /pending /today /sales /order NO /search NO|PHONE
/track NO COURIER TRACKING-ID
<b>Stock</b>: /stock · /lowstock · /addstock SKU QTY · /removestock SKU QTY · /setstock SKU QTY
<b>Products</b>: /products · /product SKU · /newproduct নাম | দাম | stock | category | description
/setprice SKU PRICE [SALE] · /describe SKU text · /publish SKU · /unpublish SKU
Photo পাঠিয়ে caption এ <code>/photo SKU</code> দিলে ছবি যোগ হবে (caption এ /newproduct দিলে নতুন product-এ ছবি)
<b>Delivery</b>: /delivery SKU free|default|FEE · /shipping · /shipping FEE [FREE-OVER] · /freelist
<b>Voucher</b>: /vouchers · /voucher CODE percent|fixed VALUE [min] [days] · /voucheroff CODE · /voucheron CODE
<b>Flash sale</b>: /flash PERCENT HOURS SKU1,SKU2 · /flashlist · /flashoff
<b>Payment</b>: /gateways · /paynumber ID NUMBER · /payinfo ID text · /gatewayon ID · /gatewayoff ID`;

export async function handleTextCommand(text:string,photo?:{fileId:string},messageId?:number,parentMenu?:string):Promise<boolean>{
  const respond=(body:string,extra:Record<string,any>={})=>{const markup=extra.reply_markup as any;const rows=markup?.inline_keyboard||[];const nav=[{text:"⬅️ Back",callback_data:"nav:back:"+((parentMenu&&["orders","products","inventory","delivery","promotions","payments","help"].includes(parentMenu))?parentMenu:"main")},{text:"✖️ Cancel",callback_data:"nav:cancel"}];const hasNav=rows.some((row:any[])=>row.some((b:any)=>String(b.callback_data||"").startsWith("nav:back")||b.callback_data==="nav:cancel"));return reply(body,{...extra,reply_markup:{...(markup||{}),inline_keyboard:hasNav?rows:[...rows,nav]}},messageId)};
  const trimmed=text.trim();
  const m=/^(\/\S+)\s*([\s\S]*)$/.exec(trimmed);
  if(!m)return false;
  const cmd=m[1].split("@")[0].toLowerCase(),arg=m[2].trim();
  const args=arg.split(/\s+/).filter(Boolean);

  if(cmd==="/photo"||(cmd==="/newproduct"&&photo)){
    if(!photo&&cmd==="/photo"){await respond("ছবি পাঠিয়ে caption এ লিখুন: <code>/photo SKU</code>");return true}
  }
  if(cmd==="/photo"&&photo){
    const p=await findProduct(args[0]||"");if(!p){await respond("Product পাওয়া যায়নি। Caption: <code>/photo SKU</code>");return true}
    await attachPhoto(p,photo.fileId);return true;
  }

  if(cmd==="/stock"||cmd==="/lowstock"){
    const ps=await db.product.findMany({orderBy:{stock:"asc"},take:cmd==="/lowstock"?50:25});
    const list=cmd==="/lowstock"?ps.filter((p:any)=>p.stock<=Number(p.lowStockThreshold??5)):ps;
    await respond("<b>📦 "+(cmd==="/lowstock"?"Low stock":"Stock")+"</b>\n"+(list.length?list.map(productLine).join("\n"):"কিছু নেই"));return true;
  }
  if(cmd==="/addstock"||cmd==="/removestock"||cmd==="/setstock"){
    const qty=num(args[1]);if(!args[0]||!Number.isInteger(qty)||qty<0||(cmd!=="/setstock"&&qty===0)){await respond("ব্যবহার: <code>"+cmd+" SKU QTY</code>");return true}
    const p=await findProduct(args[0]);if(!p){await respond("Product পাওয়া যায়নি: "+esc(args[0]));return true}
    const old=Number(p.stock||0);const next=cmd==="/addstock"?old+qty:cmd==="/removestock"?old-qty:qty;
    if(next<0){await respond("❌ Stock এর চেয়ে বেশি বাদ দেওয়া যাবে না (এখন "+old+")");return true}
    await db.product.update({where:{id:p.id},data:{stock:next}});
    await audit("STOCK_CHANGED_TELEGRAM","Product",p.id,{from:old,to:next,cmd});
    await respond("✅ "+esc(p.name)+"\nStock: "+old+" → <b>"+next+"</b>");return true;
  }
  if(cmd==="/products"){
    const ps=await db.product.findMany({orderBy:{createdAt:"desc"},take:10,select:{id:true,name:true,sku:true,price:true,salePrice:true,stock:true,published:true}});
    const lines=ps.map((p:any,i:number)=>(i+1)+". <b>"+esc(p.name)+"</b>\n   <code>"+esc(p.sku)+"</code> · "+tk(p.salePrice??p.price)+" · stock "+p.stock+" · "+(p.published?"Published":"Draft"));
    const inline_keyboard=ps.map((p:any)=>[{text:"📦 "+String(p.name).slice(0,32),callback_data:"run:/product "+p.sku+"|products"}]);
    inline_keyboard.push([{text:"📊 Inventory",callback_data:"run:/stock|inventory"},{text:"⚠️ Low Stock",callback_data:"run:/lowstock|inventory"}]);
    await respond("<b>📦 PRODUCT CATALOG</b>\n━━━━━━━━━━━━━━━━━━\n"+(lines.length?lines.join("\n\n"):"কোনো product নেই"),{reply_markup:{inline_keyboard}});return true;
  }
  if(cmd==="/product"){
    const p=await findProduct(arg);if(!p){await respond("ব্যবহার: <code>/product SKU</code> (পাওয়া যায়নি)");return true}
    const s=await db.storeSetting.findUnique({where:{id:"store"}});
    await respond("<b>"+esc(p.name)+"</b>\nSKU: <code>"+esc(p.sku)+"</code>\nদাম: "+tk(p.price)+(p.salePrice!=null?" · sale "+tk(p.salePrice):"")+"\nStock: "+p.stock+"\nStatus: "+(p.published?"Published":"Draft")+"\nDelivery: "+esc(deliveryLabel(p,Number(s?.defaultDeliveryFee??120),s?.freeShippingThreshold==null?null:Number(s.freeShippingThreshold)))+"\n\n"+esc((p.description||"").slice(0,600)),{reply_markup:{inline_keyboard:[[{text:"💲 Update Price",callback_data:"run:/setprice "+p.sku+"|products"},{text:"📦 Update Stock",callback_data:"run:/setstock "+p.sku+"|products"}],[{text:p.published?"🙈 Unpublish":"✅ Publish",callback_data:"run:"+(p.published?"/unpublish ":"/publish ")+p.sku+"|products"}],[{text:"🖼️ Add Photo",callback_data:"run:/photo "+p.sku+"|products"},{text:"🚚 Delivery",callback_data:"run:/delivery "+p.sku+"|products"}],[{text:"↩️ Product Catalog",callback_data:"run:/products|products"}]]}});return true;
  }
  if(cmd==="/newproduct"){
    const parts=arg.split("|").map(x=>x.trim());const [name,priceS,stockS,catName,...d]=parts;const price=num(priceS),stock=stockS?num(stockS):0;
    if(!name||!Number.isFinite(price)||price<0||!Number.isInteger(stock)||stock<0){await respond("<b>➕ নতুন Product তৈরি</b>\n━━━━━━━━━━━━━━━━━━\n<b>ব্যবহারের নিয়ম</b>\n<code>/newproduct নাম | দাম | stock | category | description</code>\n\n<b>উদাহরণ</b>\n<code>/newproduct Cotton T-Shirt | 650 | 25 | Clothing | Premium cotton T-shirt</code>\n\n<b>🖼️ ছবি যোগ করতে</b>\nছবি পাঠিয়ে Caption-এ একই <code>/newproduct ...</code> কমান্ডটি লিখুন।\n\n<i>টিপস: দাম ও stock সংখ্যা হিসেবে দিন। Category-এর নাম আগে থেকে থাকা ভালো।</i>");return true}
    let categoryId:string|null=null;
    if(catName){const cats=await db.category.findMany({});const c=cats.find((x:any)=>String(x.name).toLowerCase()===catName.toLowerCase());categoryId=c?.id||null}
    const sku=(name.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-|-$/g,"").toUpperCase().slice(0,20)||"ITEM")+"-"+Math.random().toString(36).slice(2,7).toUpperCase();
    let slug=slugify(name);if(await db.product.findFirst({where:{slug}}))slug+="-"+Math.random().toString(36).slice(2,6);
    const p=await db.product.create({data:{name,slug,sku,description:d.join(" | ")||null,price,compareAtPrice:null,salePrice:null,stock,lowStockThreshold:5,featured:false,published:true,categoryId,freeShipping:false,shippingFee:null}});
    await audit("PRODUCT_CREATED_TELEGRAM","Product",p.id,{sku,name});
    if(photo)await attachPhoto(p,photo.fileId);
    await respond("✅ Product তৈরি ও Published\n"+productLine(p)+(catName&&!categoryId?"\n⚠️ Category '"+esc(catName)+"' পাওয়া যায়নি":"")+(photo?"":"\nছবি যোগ করতে ছবি পাঠিয়ে caption দিন: <code>/photo "+esc(sku)+"</code>"));return true;
  }
  if(cmd==="/setprice"){
    const price=num(args[1]),sale=args[2]?num(args[2]):null;const p=await findProduct(args[0]||"");
    if(!p||!Number.isFinite(price)||price<0||(sale!==null&&(!Number.isFinite(sale)||sale<0||sale>price))){await respond("ব্যবহার: <code>/setprice SKU PRICE [SALE]</code>");return true}
    await db.product.update({where:{id:p.id},data:{price,salePrice:sale}});await audit("PRICE_CHANGED_TELEGRAM","Product",p.id,{price,sale});
    await respond("✅ "+esc(p.name)+" → "+tk(price)+(sale!==null?" (sale "+tk(sale)+")":""));return true;
  }
  if(cmd==="/describe"){
    const p=await findProduct(args[0]||"");const d=arg.slice((args[0]||"").length).trim();
    if(!p||!d){await respond("ব্যবহার: <code>/describe SKU নতুন description</code>");return true}
    await db.product.update({where:{id:p.id},data:{description:d.slice(0,5000)}});await audit("PRODUCT_UPDATED_TELEGRAM","Product",p.id,{field:"description"});
    await respond("✅ Description আপডেট: "+esc(p.name));return true;
  }
  if(cmd==="/publish"||cmd==="/unpublish"){
    const p=await findProduct(args[0]||"");if(!p){await respond("ব্যবহার: <code>"+cmd+" SKU</code>");return true}
    await db.product.update({where:{id:p.id},data:{published:cmd==="/publish"}});await audit("PRODUCT_UPDATED_TELEGRAM","Product",p.id,{published:cmd==="/publish"});
    await respond("✅ "+esc(p.name)+" → "+(cmd==="/publish"?"Published":"Draft"));return true;
  }
  if(cmd==="/delivery"){
    const p=await findProduct(args[0]||"");const mode=(args[1]||"").toLowerCase();
    if(!p||!mode){await respond("ব্যবহার: <code>/delivery SKU free</code> | <code>default</code> | <code>FEE</code>");return true}
    let data:any;
    if(mode==="free")data={freeShipping:true,shippingFee:null};
    else if(mode==="default")data={freeShipping:false,shippingFee:null};
    else{const f=num(mode);if(!Number.isFinite(f)||f<0){await respond("❌ ভুল মান");return true}data={freeShipping:false,shippingFee:f}}
    await db.product.update({where:{id:p.id},data});await audit("DELIVERY_CHANGED_TELEGRAM","Product",p.id,data);
    await respond("✅ "+esc(p.name)+" delivery: <b>"+(data.freeShipping?"Free":data.shippingFee!=null?tk(data.shippingFee):"Default")+"</b>");return true;
  }
  if(cmd==="/freelist"){
    const ps=(await db.product.findMany({where:{freeShipping:true},take:50}));
    await respond("<b>🚚 Free delivery products</b>\n"+(ps.length?ps.map(productLine).join("\n"):"কোনো product নেই"));return true;
  }
  if(cmd==="/shipping"){
    const cur=await db.storeSetting.findUnique({where:{id:"store"}});
    if(args.length){
      const fee=num(args[0]),over=args[1]!==undefined?(args[1].toLowerCase()==="off"?null:num(args[1])):undefined;
      if(!Number.isFinite(fee)||fee<0||(over!==undefined&&over!==null&&(!Number.isFinite(over)||over<0))){await respond("ব্যবহার: <code>/shipping FEE [FREE-OVER|off]</code>");return true}
      const data:any={defaultDeliveryFee:fee,updatedAt:new Date()};if(over!==undefined)data.freeShippingThreshold=over;
      if(cur)await db.storeSetting.update({where:{id:"store"},data});else await db.storeSetting.create({data:{id:"store",storeName:"MART Store",currency:"BDT",taxEnabled:false,taxRate:0,announcement:"",supportEmail:"",supportPhone:"",freeShippingThreshold:3000,...data}});
      await audit("SHIPPING_DEFAULTS_TELEGRAM","storeSetting","store",data);
    }
    const s=await db.storeSetting.findUnique({where:{id:"store"}});
    await respond("<b>🚚 Delivery</b>\nDefault fee: "+tk(s?.defaultDeliveryFee??120)+"\nFree over: "+(s?.freeShippingThreshold==null?"off":tk(s.freeShippingThreshold)));return true;
  }
  if(cmd==="/vouchers"){
    const cs=await db.coupon.findMany({orderBy:{expiresAt:"asc"},take:30});
    await respond("<b>🎟 Vouchers</b>\n"+(cs.length?cs.map((c:any)=>"<code>"+esc(c.code)+"</code> · "+(c.type==="PERCENT"?Number(c.value)+"%":tk(c.value))+(c.minOrder?" · min "+tk(c.minOrder):"")+(c.expiresAt?" · till "+new Date(c.expiresAt).toLocaleDateString("en-GB"):"")+" · "+(c.active?"ON":"OFF")).join("\n"):"কোনো voucher নেই"));return true;
  }
  if(cmd==="/voucher"){
    const code=(args[0]||"").toUpperCase(),type=(args[1]||"").toLowerCase(),value=num(args[2]),min=args[3]?num(args[3]):null,days=args[4]?num(args[4]):null;
    if(code.length<2||!["percent","fixed"].includes(type)||!Number.isFinite(value)||value<=0||(type==="percent"&&value>100)||(min!==null&&!Number.isFinite(min))||(days!==null&&!Number.isFinite(days))){await respond("<b>🎟️ Voucher তৈরি করুন</b>\n━━━━━━━━━━━━━━━━━━\n<b>ব্যবহারের নিয়ম</b>\n<code>/voucher CODE percent|fixed VALUE [min-order] [days]</code>\n\n<b>উদাহরণ · Percentage Discount</b>\n<code>/voucher EID10 percent 10 500 7</code>\n• Code: <code>EID10</code>\n• Discount: 10%\n• Minimum order: ৳500\n• Validity: 7 দিন\n\n<b>Discount Type</b>\n• <code>percent</code> — শতকরা ছাড়\n• <code>fixed</code> — নির্দিষ্ট টাকার ছাড়\n\n<i>ঐচ্ছিক: Minimum order ও validity না দিলে সেগুলো সেট হবে না।</i>");return true}
    if(await db.coupon.findFirst({where:{code}})){await respond("❌ এই code আগে থেকেই আছে");return true}
    const c=await db.coupon.create({data:{name:null,code,type:type==="percent"?"PERCENT":"FIXED",value,minOrder:min,expiresAt:days?new Date(Date.now()+days*86400000):null,active:true}});
    await audit("COUPON_CREATED_TELEGRAM","coupon",c.id,{code,type,value});
    await respond("✅ Voucher <code>"+esc(code)+"</code> তৈরি: "+(type==="percent"?value+"%":tk(value))+(min?" · min "+tk(min):"")+(days?" · "+days+" দিন":""));return true;
  }
  if(cmd==="/voucheroff"||cmd==="/voucheron"){
    const c=await db.coupon.findFirst({where:{code:(args[0]||"").toUpperCase()}});if(!c){await respond("Voucher পাওয়া যায়নি");return true}
    await db.coupon.update({where:{id:c.id},data:{active:cmd==="/voucheron"}});await audit("COUPON_TOGGLED_TELEGRAM","coupon",c.id,{active:cmd==="/voucheron"});
    await respond("✅ "+esc(c.code)+" → "+(cmd==="/voucheron"?"ON":"OFF"));return true;
  }
  if(cmd==="/flash"){
    const pct=num(args[0]),hrs=num(args[1]),skus=(args[2]||"").split(",").map(x=>x.trim()).filter(Boolean);
    if(!Number.isInteger(pct)||pct<1||pct>90||!Number.isFinite(hrs)||hrs<=0||hrs>24*30||!skus.length){await respond("ব্যবহার: <code>/flash PERCENT HOURS SKU1,SKU2</code>\nউদাহরণ: <code>/flash 20 24 TSHIRT-1,SHOE-2</code>");return true}
    const found:any[]=[],missing:string[]=[];for(const k of skus){const p=await findProduct(k);p?found.push(p):missing.push(k)}
    if(!found.length){await respond("❌ কোনো product পাওয়া যায়নি");return true}
    const now=new Date();const f=await db.flashSale.create({data:{title:"Flash Sale "+pct+"% OFF",productIds:found.map(p=>p.id),discountPercent:pct,startsAt:now,endsAt:new Date(now.getTime()+hrs*3600000),active:true}});
    await audit("FLASH_SALE_CREATED_TELEGRAM","flashSale",f.id,{pct,hours:hrs,count:found.length});
    await respond("⚡ Flash sale চালু: "+pct+"% OFF, "+hrs+" ঘণ্টা\n"+found.map(p=>esc(p.name)).join(", ")+(missing.length?"\n⚠️ পাওয়া যায়নি: "+esc(missing.join(", ")):""));return true;
  }
  if(cmd==="/flashlist"){
    const fs=await db.flashSale.findMany({orderBy:{startsAt:"desc"},take:10});
    await respond("<b>⚡ Flash sales</b>\n"+(fs.length?fs.map((f:any)=>esc(f.title)+" · "+f.discountPercent+"% · "+f.productIds.length+" products · till "+new Date(f.endsAt).toLocaleString("en-GB",{timeZone:"Asia/Dhaka"})+" · "+(f.active?"ON":"OFF")).join("\n"):"কোনো sale নেই"));return true;
  }
  if(cmd==="/flashoff"){
    const fs=(await db.flashSale.findMany({where:{active:true}}));for(const f of fs)await db.flashSale.update({where:{id:f.id},data:{active:false}});
    await audit("FLASH_SALE_OFF_TELEGRAM","flashSale",null,{count:fs.length});await respond("✅ "+fs.length+"টি flash sale বন্ধ");return true;
  }
  if(cmd==="/report"){
    const days=Math.min(90,Math.max(1,Number.isFinite(num(args[0]))?Math.floor(num(args[0])):7));
    const since=new Date(Date.now()-days*86400000);
    const os=await db.order.findMany({where:{createdAt:{gte:since}},include:{items:true},take:2000});
    const paid=os.filter((o:any)=>o.paymentStatus==="PAID");
    const rev=paid.reduce((a:number,o:any)=>a+Number(o.total||0),0);
    const by:Record<string,{n:string;q:number}>={};
    for(const o of paid)for(const i of (o.items||[])){const e=by[i.productId||i.name]||(by[i.productId||i.name]={n:i.name,q:0});e.q+=Number(i.quantity||0)}
    const top=Object.values(by).sort((a,b)=>b.q-a.q).slice(0,5);
    const cancelled=os.filter((o:any)=>o.status==="CANCELLED").length;
    await reply("<b>📊 Report — last "+days+" days</b>\nOrders: "+os.length+" · Paid: "+paid.length+" · Cancelled: "+cancelled+"\nPaid revenue: <b>"+tk(rev)+"</b>\nAvg order: "+tk(paid.length?rev/paid.length:0)+"\n\n<b>Top products</b>\n"+(top.length?top.map(t=>esc(t.n)+" × "+t.q).join("\n"):"—"));return true;
  }
  if(cmd==="/returns"){
    const rs=(await db.returnRequest.findMany({orderBy:{createdAt:"desc"},take:15}));
    await reply("<b>↩️ Returns</b>\n"+(rs.length?rs.map((r:any)=>"<code>"+esc(r.id)+"</code>\n"+esc(r.orderNumber)+" · "+esc(r.customerName)+" · "+r.status+"\n"+esc(r.reason)).join("\n\n"):"কোনো request নেই"));return true;
  }
  if(cmd==="/return"){
    const r:any=await db.returnRequest.findUnique({where:{id:args[0]||""}}).catch(()=>null);const act=(args[1]||"").toLowerCase();
    const to=act==="approve"?"APPROVED":act==="reject"?"REJECTED":act==="refunded"?"REFUNDED":"";
    const flow:Record<string,string[]>={REQUESTED:["APPROVED","REJECTED"],APPROVED:["REFUNDED","REJECTED"]};
    if(!r||!to){await reply("ব্যবহার: <code>/return ID approve|reject|refunded</code> (ID পেতে /returns)");return true}
    if(!flow[r.status]?.includes(to)){await reply("❌ "+r.status+" → "+to+" সম্ভব না");return true}
    await db.returnRequest.update({where:{id:r.id},data:{status:to,updatedAt:new Date()}});await audit("RETURN_"+to+"_TELEGRAM","returnRequest",r.id,{orderNumber:r.orderNumber});
    await reply("✅ "+esc(r.orderNumber)+" return → <b>"+to+"</b>"+(to==="APPROVED"?"\nটাকা ফেরত দিলে /return "+esc(r.id)+" refunded":""));return true;
  }
  if(cmd==="/order"){
    if(!arg){await respond("ব্যবহার: <code>/order ORDER-NO</code>");return true}
    const o=await db.order.findFirst({where:{orderNumber:arg.toUpperCase()},include:{items:true,paymentGateway:true}})||await db.order.findFirst({where:{orderNumber:{contains:arg,mode:"insensitive"}},include:{items:true,paymentGateway:true}});
    await respond(o?"<b>Order Details</b>\n"+orderDetailsText(o):"Order পাওয়া যায়নি");return true;
  }
  if(cmd==="/track"){
    const [no,courier,...t]=args;const o=no?await db.order.findFirst({where:{orderNumber:{equals:no.toUpperCase(),mode:"insensitive"}},include:{items:true,paymentGateway:true}}):null;
    if(!o){await respond("ব্যবহার: <code>/track ORDER-NO</code> — বর্তমান tracking দেখুন\nঅথবা tracking সেট করতে: <code>/track ORDER-NO COURIER TRACKING-ID</code>");return true}
    if(!courier){const lines=["<b>🚚 ORDER TRACKING</b>","Order: <code>"+esc(o.orderNumber)+"</code>","Status: <b>"+esc(o.status)+"</b>","Courier: "+esc(o.courierName||"এখনও সেট করা হয়নি"),"Tracking ID: "+(o.trackingNumber?"<code>"+esc(o.trackingNumber)+"</code>":"এখনও সেট করা হয়নি"),"Payment: <b>"+esc(o.paymentStatus)+"</b>"];await respond(lines.join("\n"),{disable_web_page_preview:true});return true}
    if(!t.length){await respond("Tracking ID দিন: <code>/track ORDER-NO COURIER TRACKING-ID</code>");return true}
    if(!["PROCESSING","SHIPPED","DELIVERED"].includes(o.status)){await respond("❌ Order এখন "+esc(o.status)+" — Processing/Shipped হলে courier দিন");return true}
    await db.order.update({where:{id:o.id},data:{courierName:courier.slice(0,120),trackingNumber:t.join(" ").slice(0,160)}});await audit("TRACKING_SET_TELEGRAM","Order",o.id,{courier,trackingNumber:t.join(" ")});
    await respond("✅ <b>TRACKING UPDATED</b>\nOrder: <code>"+esc(o.orderNumber)+"</code>\nCourier: "+esc(courier)+"\nTracking ID: <code>"+esc(t.join(" "))+"</code>\nStatus: "+esc(o.status));return true;
  }
  if(cmd==="/gateways"){
    const gs=await db.paymentGateway.findMany({orderBy:{sortOrder:"asc"}});
    await respond("<b>💳 Gateways</b>\n"+(gs.length?gs.map((g:any)=>"<code>"+esc(g.id)+"</code>\n"+esc(g.name)+" ("+g.type+") · "+(g.enabled?"ON":"OFF")+"\nNumber: "+esc(g.publicConfig?.merchantNumber||"—")+"\nInfo: "+esc(String(g.publicConfig?.instructions||"—").slice(0,200))).join("\n\n"):"কোনো gateway নেই"));return true;
  }
  if(cmd==="/paynumber"||cmd==="/payinfo"||cmd==="/gatewayon"||cmd==="/gatewayoff"){
    const g=await db.paymentGateway.findUnique({where:{id:args[0]||""}}).catch(()=>null);
    if(!g){await respond("ব্যবহার: <code>"+cmd+" GATEWAY-ID ...</code> (ID পেতে /gateways)");return true}
    const val=arg.slice(args[0].length).trim();
    if(cmd==="/gatewayon"||cmd==="/gatewayoff"){
      await db.paymentGateway.update({where:{id:g.id},data:{enabled:cmd==="/gatewayon"}});await audit("GATEWAY_TOGGLED_TELEGRAM","paymentGateway",g.id,{enabled:cmd==="/gatewayon"});
      await respond("✅ "+esc(g.name)+" → "+(cmd==="/gatewayon"?"ON":"OFF"));return true;
    }
    if(!val){await respond("মান দিন: <code>"+cmd+" "+esc(g.id)+" ...</code>");return true}
    if(cmd==="/paynumber"&&!/^[0-9+\- ]{6,20}$/.test(val)){await respond("❌ Number ঠিক নয়");return true}
    const key=cmd==="/paynumber"?"merchantNumber":"instructions";const old=g.publicConfig?.[key]??null;
    await db.paymentGateway.update({where:{id:g.id},data:{publicConfig:{...(g.publicConfig||{}),[key]:val.slice(0,1500)}}});
    await audit("GATEWAY_"+(key==="merchantNumber"?"NUMBER":"INSTRUCTIONS")+"_CHANGED_TELEGRAM","paymentGateway",g.id,{from:old,to:val.slice(0,1500)});
    await respond("⚠️ <b>Payment "+(key==="merchantNumber"?"number":"instructions")+" পরিবর্তন হয়েছে</b> ("+esc(g.name)+")\nআগে: "+esc(old||"—")+"\nএখন: "+esc(val));return true;
  }
  return false;
}

async function attachPhoto(p:any,fileId:string){
  const token=process.env.TELEGRAM_BOT_TOKEN;
  try{
    const f=await telegramApi("getFile",{file_id:fileId});const path=f?.result?.file_path;if(!path||!token)throw new Error("no file");
    const r=await fetch("https://api.telegram.org/file/bot"+token+"/"+path,{cache:"no-store"});if(!r.ok)throw new Error("download");
    const bytes=new Uint8Array(await r.arrayBuffer());
    const mime=/\.png$/i.test(path)?"image/png":/\.webp$/i.test(path)?"image/webp":"image/jpeg";
    if(bytes.length>MAX_IMAGE_BYTES){await reply("❌ ছবি বড় ("+Math.round(bytes.length/1000)+" KB)। Telegram-এ 'compress' করে (ছবি হিসেবে, file নয়) পাঠান — সর্বোচ্চ 650 KB।");return}
    await saveProductImage(p.id,bytes,mime,p.name);await audit("PRODUCT_IMAGE_ADDED_TELEGRAM","Product",p.id,{});
    await reply("🖼 ছবি যোগ হয়েছে: "+esc(p.name));
  }catch{await reply("❌ ছবি যোগ করা যায়নি, আবার চেষ্টা করুন")}
}
