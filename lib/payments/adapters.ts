import type {PaymentAdapter,PaymentContext,PaymentInitResult} from "./types";

const unsupported=(name:string):PaymentAdapter=>({
 async init(_:PaymentContext){return {ok:false,status:"ERROR",message:name+" gateway is not configured yet."}},
 async verify(){return {ok:false}}
});

export const paymentAdapters:Record<string,PaymentAdapter>={
 SSLCOMMERZ:unsupported("SSLCOMMERZ"),
 BKASH:unsupported("bKash"),
 NAGAD:unsupported("Nagad"),
 ROCKET:unsupported("Rocket"),
 CUSTOM:unsupported("Custom"),
 BANGLA_QR:{
  async init(ctx,config){
   const qrImageUrl=typeof config.qrImageUrl==="string"?config.qrImageUrl:undefined;
   return {ok:true,status:qrImageUrl?"QR":"MANUAL",qrImageUrl,reference:ctx.orderNumber,message:"Complete payment using the configured Bangla QR and use the order number as reference."};
  },
  async verify(payload){return {ok:false,reference:typeof payload==="object"&&payload&&"reference" in payload?String((payload as {reference:unknown}).reference):undefined};}
 }
};
