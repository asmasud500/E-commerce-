export type PaymentContext = { orderId:string; orderNumber:string; amount:number; customerName:string; customerPhone:string; customerEmail?:string; callbackBaseUrl:string };
export type PaymentInitResult = { ok:boolean; status:"REDIRECT"|"QR"|"MANUAL"|"ERROR"; paymentUrl?:string; qrImageUrl?:string; reference?:string; message?:string };
export type PaymentVerification = {ok:boolean;reference?:string;amount?:number;raw?:unknown};
export interface PaymentAdapter { init(ctx:PaymentContext, config:Record<string,unknown>, secrets:Record<string,unknown>):Promise<PaymentInitResult>; verify(payload:unknown, config:Record<string,unknown>, secrets:Record<string,unknown>):Promise<PaymentVerification>; }
