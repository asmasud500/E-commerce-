import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {readAdminSession} from "@/lib/auth/admin";
import {readTelegramFile,storeTelegramFile} from "@/lib/telegram/file-storage";

const esc=(value:unknown)=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const money=(value:unknown)=>"৳"+Number(value||0).toLocaleString("en-BD",{maximumFractionDigits:2});

async function authorized(req:NextRequest){return !!(await readAdminSession(req.cookies.get("admin_session")?.value||""));}

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  if(!await authorized(req))return NextResponse.json({error:"Admin authentication required."},{status:401});
  const {id}=await params;
  try{
    const order:any=await db.order.findUnique({where:{id},include:{items:true,paymentGateway:true}});
    if(!order)return NextResponse.json({error:"Order not found."},{status:404});
    const settings:any=await db.storeSetting.findUnique({where:{id:"store"}}).catch(()=>null);
    const rows=(order.items||[]).map((item:any)=>"<tr><td>"+esc(item.name)+"</td><td>"+Number(item.quantity)+"</td><td>"+money(item.unitPrice)+"</td><td>"+money(item.lineTotal)+"</td></tr>").join("");
    const html="<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Invoice "+esc(order.orderNumber)+"</title><style>body{font:15px Arial,sans-serif;color:#172033;max-width:820px;margin:32px auto;padding:24px}header{display:flex;justify-content:space-between;border-bottom:3px solid #142b4a;padding-bottom:18px}h1{margin:0;color:#142b4a}table{width:100%;border-collapse:collapse;margin-top:28px}th,td{text-align:left;padding:12px;border-bottom:1px solid #ddd}th{background:#f2f5f8}.totals{margin:22px 0 0 auto;width:280px}.totals div{display:flex;justify-content:space-between;padding:5px}.grand{border-top:2px solid #142b4a;font-weight:bold;font-size:19px}small{color:#687386}@media print{body{margin:0}}</style></head><body><header><div><h1>"+esc(settings?.storeName||"MART Store")+"</h1><p>"+esc(settings?.supportPhone||"")+"<br>"+esc(settings?.supportEmail||"")+"</p></div><div style=\"text-align:right\"><h2>INVOICE</h2><b>"+esc(order.orderNumber)+"</b><p>"+esc(new Date(order.createdAt).toLocaleDateString("en-GB"))+"</p></div></header><section><h3>Bill to</h3>"+esc(order.customerName)+"<br>"+esc(order.customerPhone)+"<br>"+esc(order.customerEmail||"")+"<br>"+esc(order.shippingAddress)+"</section><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>"+rows+"</tbody></table><div class=\"totals\"><div><span>Subtotal</span><span>"+money(order.subtotal)+"</span></div><div><span>Discount</span><span>−"+money(order.discount)+"</span></div><div><span>Delivery</span><span>"+money(order.shippingFee)+"</span></div><div class=\"grand\"><span>Total</span><span>"+money(order.total)+"</span></div></div><p>Payment: <b>"+esc(order.paymentStatus)+"</b>"+(order.paymentGateway?" via "+esc(order.paymentGateway.name):"")+"</p><small>Thank you for shopping with us.</small></body></html>";
    const saved=await storeTelegramFile(new TextEncoder().encode(html),"invoice-"+String(order.orderNumber).replace(/[^a-zA-Z0-9_-]/g,"")+".html","text/html","Invoice · "+order.orderNumber);
    await db.order.update({where:{id},data:{invoiceTelegramFileId:saved.fileId,invoiceTelegramMessageId:saved.messageId}});
    return NextResponse.json({ok:true,orderNumber:order.orderNumber,fileId:saved.fileId});
  }catch(error){
    console.error("Telegram invoice storage failed:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Unable to store invoice in Telegram. Check bot configuration and database."},{status:503});
  }
}

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  if(!await authorized(req))return NextResponse.json({error:"Admin authentication required."},{status:401});
  const {id}=await params;
  try{
    const order=await db.order.findUnique({where:{id},select:{orderNumber:true,invoiceTelegramFileId:true}});
    if(!order)return NextResponse.json({error:"Order not found."},{status:404});
    if(!order.invoiceTelegramFileId)return NextResponse.json({error:"Invoice has not been stored in Telegram yet."},{status:404});
    const file=await readTelegramFile(order.invoiceTelegramFileId);
    if(!file)return NextResponse.json({error:"Stored invoice file was not found."},{status:404});
    const name=String(order.orderNumber).replace(/[^a-zA-Z0-9_-]/g,"");
    return new Response(file.bytes.buffer.slice(file.bytes.byteOffset,file.bytes.byteOffset+file.bytes.byteLength) as ArrayBuffer,{headers:{"Content-Type":"text/html; charset=utf-8","Content-Length":String(file.bytes.byteLength),"Content-Disposition":'attachment; filename="invoice-'+name+'.html"',"Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff"}});
  }catch(error){
    console.error("Telegram invoice retrieval failed:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Unable to retrieve stored invoice."},{status:503});
  }
}
