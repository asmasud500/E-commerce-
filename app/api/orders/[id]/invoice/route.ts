import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {verifyCustomerToken} from "@/lib/auth/customer";
import {verifyOrderAccessToken} from "@/lib/auth/order-access";
import {rateLimit} from "@/lib/security/rate-limit";

const esc=(v:unknown)=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const money=(v:unknown)=>"৳"+Number(v||0).toLocaleString("en-BD",{maximumFractionDigits:2});

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")||"unknown";
 const rl=rateLimit("invoice:"+ip,20,60_000);
 if(!rl.ok)return NextResponse.json({error:"Too many invoice downloads. Please try again shortly."},{status:429,headers:{"Retry-After":String(rl.retryAfter)}});
 const {id}=await params;
 const token=req.cookies.get("customer_session")?.value;
 const session=token?await verifyCustomerToken(token):null;
 const accessToken=new URL(req.url).searchParams.get("accessToken")||"";
 try{
  const order:any=await db.order.findUnique({where:{id},include:{items:true,paymentGateway:true}});
  if(!order)return NextResponse.json({error:"Order not found."},{status:404});
  const isOwner=!!session&&!!order.userId&&session.userId===order.userId;
  const hasOrderAccess=accessToken?await verifyOrderAccessToken(id,accessToken):false;
  if(!isOwner&&!hasOrderAccess)return NextResponse.json({error:"Please log in or use the valid order access link to download this invoice."},{status:403});
  const settings:any=await db.storeSetting.findUnique({where:{id:"store"}}).catch(()=>null);
  const rows=(order.items||[]).map((item:any)=>"<tr><td>"+esc(item.name)+"</td><td>"+Number(item.quantity)+"</td><td>"+money(item.unitPrice)+"</td><td>"+money(item.lineTotal)+"</td></tr>").join("");
  const addr=esc(order.shippingAddress).replace(/, /g,",<br>");
  const html="<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Invoice "+esc(order.orderNumber)+"</title><style>*{box-sizing:border-box}body{font:15px Arial,sans-serif;color:#172033;max-width:850px;margin:24px auto;padding:24px;line-height:1.5}header{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #142b4a;padding-bottom:18px}h1{margin:0;color:#142b4a;font-size:27px}h2{margin:0 0 8px;font-size:20px}small,.muted{color:#687386}.pill{display:inline-block;background:"+(order.paymentStatus==="PAID"?"#dcfce7":"#fff0e6")+";color:"+(order.paymentStatus==="PAID"?"#166534":"#9a3412")+";padding:5px 10px;border-radius:999px;font-weight:bold;font-size:12px}section{margin-top:22px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{text-align:left;padding:12px 8px;border-bottom:1px solid #e1e6ed}th{background:#f2f5f8;color:#142b4a}td:nth-child(2),td:nth-child(3),td:nth-child(4),th:nth-child(2),th:nth-child(3),th:nth-child(4){text-align:right}.totals{margin:20px 0 0 auto;width:min(100%,310px)}.totals div{display:flex;justify-content:space-between;padding:5px}.grand{border-top:2px solid #142b4a;font-weight:bold;font-size:19px;margin-top:5px;padding-top:10px!important}.toolbar{display:flex;gap:10px;justify-content:flex-end;margin-bottom:20px}.toolbar button{border:0;background:#142b4a;color:white;padding:10px 14px;border-radius:8px;cursor:pointer}@media(max-width:520px){body{padding:14px;margin:0;font-size:13px}header{flex-direction:column}td,th{padding:8px 4px;font-size:12px}}@media print{body{margin:0;padding:0}.toolbar{display:none!important}}</style></head><body><div class=\"toolbar\"><button onclick=\"window.print()\">Print / Save as PDF</button></div><header><div><h1>"+esc(settings?.storeName||"MART Store")+"</h1><p class=\"muted\">"+esc(settings?.supportPhone||"")+"<br>"+esc(settings?.supportEmail||"")+"</p></div><div style=\"text-align:right\"><h2>INVOICE</h2><b>"+esc(order.orderNumber)+"</b><p>"+esc(new Date(order.createdAt).toLocaleDateString("en-GB"))+"</p><span class=\"pill\">PAYMENT: "+esc(order.paymentStatus)+"</span></div></header><section><h2>Bill to</h2>"+esc(order.customerName)+"<br>"+esc(order.customerPhone)+"<br>"+esc(order.customerEmail||"")+"<p>"+addr+"</p></section><table><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>"+rows+"</tbody></table><div class=\"totals\"><div><span>Subtotal</span><span>"+money(order.subtotal)+"</span></div><div><span>Discount</span><span>−"+money(order.discount)+"</span></div><div><span>Delivery</span><span>"+money(order.shippingFee)+"</span></div>"+(Number(order.taxAmount)>0?"<div><span>Tax</span><span>"+money(order.taxAmount)+"</span></div>":"")+"<div class=\"grand\"><span>Total</span><span>"+money(order.total)+"</span></div></div><section><p>Payment method: <b>"+esc(order.paymentGateway?.name||order.paymentProvider||"Not specified")+"</b></p><p class=\"muted\">Thank you for shopping with us.</p></section></body></html>";
  const safe=String(order.orderNumber).replace(/[^a-zA-Z0-9_-]/g,"");
  return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8","Content-Disposition":'attachment; filename="invoice-'+safe+'.html"',"Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff"}});
 }catch(error){
  console.error("Customer invoice generation failed:",error instanceof Error?error.message:String(error));
  return NextResponse.json({error:"Unable to generate invoice right now."},{status:503});
 }
}