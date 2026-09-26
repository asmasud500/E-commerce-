import type {PaymentAdapter,PaymentContext} from "./types";

const unsupported=(name:string):PaymentAdapter=>({
 async init(){return {ok:false,status:"ERROR",message:name+" gateway is not configured yet."}},
 async verify(){return {ok:false}}
});

const sslcommerz:PaymentAdapter={
 async init(ctx,config,secrets){
  const base=String(config.apiBaseUrl||"https://sandbox.sslcommerz.com");
  const storeId=String(secrets.storeId||""),storePassword=String(secrets.storePassword||"");
  if(!storeId||!storePassword)return {ok:false,status:"ERROR",message:"SSLCOMMERZ credentials are not configured."};
  const body=new URLSearchParams({store_id:storeId,store_passwd:storePassword,total_amount:ctx.amount.toFixed(2),currency:"BDT",tran_id:ctx.orderNumber,success_url:ctx.callbackBaseUrl+"/api/payments/sslcommerz/success",fail_url:ctx.callbackBaseUrl+"/api/payments/sslcommerz/fail",cancel_url:ctx.callbackBaseUrl+"/api/payments/sslcommerz/cancel",ipn_url:ctx.callbackBaseUrl+"/api/payments/sslcommerz/ipn",cus_name:ctx.customerName,cus_phone:ctx.customerPhone,cus_email:ctx.customerEmail||"customer@example.com",shipping_method:"NO",product_name:"Order "+ctx.orderNumber,product_category:"General",product_profile:"general"});
  const res=await fetch(base+"/gwprocess/v4/api.php",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
  const data=await res.json().catch(()=>null) as {GatewayPageURL?:string;failedreason?:string}|null;
  if(!res.ok||!data?.GatewayPageURL)return {ok:false,status:"ERROR",message:data?.failedreason||"SSLCOMMERZ session creation failed."};
  return {ok:true,status:"REDIRECT",paymentUrl:data.GatewayPageURL,reference:ctx.orderNumber};
 },
 async verify(payload,config,secrets){
  const p=payload as Record<string,unknown>;const valId=String(p.val_id||"");if(!valId)return {ok:false};
  const base=String(config.apiBaseUrl||"https://sandbox.sslcommerz.com"),storeId=String(secrets.storeId||""),storePassword=String(secrets.storePassword||"");
  if(!storeId||!storePassword)return {ok:false};
  const url=base+"/validator/api/validationserverAPI.php?val_id="+encodeURIComponent(valId)+"&store_id="+encodeURIComponent(storeId)+"&store_passwd="+encodeURIComponent(storePassword)+"&v=1&format=json";
  const res=await fetch(url);const data=await res.json().catch(()=>null) as {status?:string;tran_id?:string}|null;
  return {ok:data?.status==="VALID"||data?.status==="VALIDATED",reference:data?.tran_id||valId};
 }
};

export const paymentAdapters:Record<string,PaymentAdapter>={
 SSLCOMMERZ:sslcommerz,BKASH:unsupported("bKash"),NAGAD:unsupported("Nagad"),ROCKET:unsupported("Rocket"),CUSTOM:unsupported("Custom"),
 BANGLA_QR:{async init(ctx,config){const qrImageUrl=typeof config.qrImageUrl==="string"?config.qrImageUrl:undefined;return {ok:true,status:qrImageUrl?"QR":"MANUAL",qrImageUrl,reference:ctx.orderNumber,message:"Complete payment using the configured Bangla QR and use the order number as reference."}},async verify(){return {ok:false}}}
};
