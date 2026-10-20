import type {PaymentAdapter} from "./types";

/**
 * Automated checkout only. bKash/Nagad/Rocket and card/bank channels must be
 * enabled under a licensed aggregator's merchant account (for example SSLCOMMERZ).
 * Direct personal-number transfers and QR instructions are intentionally not
 * treated as successful/automatic payments.
 */
const sslcommerz:PaymentAdapter={
 async init(ctx,config,secrets){
  const storeId=String(secrets.storeId||"").trim();
  const storePassword=String(secrets.storePassword||"").trim();
  if(!storeId||!storePassword)return {ok:false,status:"ERROR",message:"Automated payment is not configured. Add your SSLCOMMERZ merchant Store ID and Store Password in Admin → Payment Gateways."};
  const mode=String(config.mode||"SANDBOX").toUpperCase();
  const base=mode==="LIVE"?"https://securepay.sslcommerz.com":"https://sandbox.sslcommerz.com";
  const body=new URLSearchParams({
   store_id:storeId,store_passwd:storePassword,total_amount:ctx.amount.toFixed(2),currency:"BDT",tran_id:ctx.orderNumber,
   success_url:ctx.callbackBaseUrl+"/api/payments/sslcommerz/success",
   fail_url:ctx.callbackBaseUrl+"/api/payments/sslcommerz/fail",
   cancel_url:ctx.callbackBaseUrl+"/api/payments/sslcommerz/cancel",
   ipn_url:ctx.callbackBaseUrl+"/api/payments/sslcommerz/ipn",
   cus_name:ctx.customerName,cus_phone:ctx.customerPhone,cus_email:ctx.customerEmail||"customer@invalid.example",
   shipping_method:"NO",product_name:"Order "+ctx.orderNumber,product_category:"General",product_profile:"general"
  });
  const res=await fetch(base+"/gwprocess/v4/api.php",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
  const data=await res.json().catch(()=>null) as {GatewayPageURL?:string;failedreason?:string;status?:string}|null;
  if(!res.ok||!data?.GatewayPageURL||!data.GatewayPageURL.startsWith(base+"/"))return {ok:false,status:"ERROR",message:data?.failedreason||"SSLCOMMERZ session creation failed. Please try again."};
  return {ok:true,status:"REDIRECT",paymentUrl:data.GatewayPageURL,reference:ctx.orderNumber};
 },
 async verify(payload,config,secrets){
  const p=payload as Record<string,unknown>,valId=String(p.val_id||"");
  if(!valId)return {ok:false};
  const storeId=String(secrets.storeId||"").trim(),storePassword=String(secrets.storePassword||"").trim();
  if(!storeId||!storePassword)return {ok:false};
  const mode=String(config.mode||"SANDBOX").toUpperCase();
  const base=mode==="LIVE"?"https://securepay.sslcommerz.com":"https://sandbox.sslcommerz.com";
  const url=base+"/validator/api/validationserverAPI.php?val_id="+encodeURIComponent(valId)+"&store_id="+encodeURIComponent(storeId)+"&store_passwd="+encodeURIComponent(storePassword)+"&v=1&format=json";
  const res=await fetch(url);
  const data=await res.json().catch(()=>null) as {status?:string;tran_id?:string;amount?:string|number;currency?:string;currency_type?:string}|null;
  const amount=Number(data?.amount),transaction=String(data?.tran_id||"");
  const validStatus=data?.status==="VALID"||data?.status==="VALIDATED";
  return {ok:res.ok&&validStatus&&transaction.length>0&&Number.isFinite(amount)&&amount>0&&String(data?.currency||"BDT")==="BDT",reference:transaction||undefined,providerTransactionId:valId,amount:Number.isFinite(amount)&&amount>0?amount:undefined,raw:data};
 }
};

const unavailable=(name:string):PaymentAdapter=>({
 async init(){return {ok:false,status:"ERROR",message:name+" manual transfers are disabled. Configure an approved automated payment gateway in Admin → Payment Gateways."}},
 async verify(){return {ok:false}}
});

export const paymentAdapters:Record<string,PaymentAdapter>={
 SSLCOMMERZ:sslcommerz,
 BKASH:unavailable("bKash"),
 NAGAD:unavailable("Nagad"),
 ROCKET:unavailable("Rocket"),
 CUSTOM:unavailable("Custom"),
 BANGLA_QR:unavailable("Bangla QR")
};
