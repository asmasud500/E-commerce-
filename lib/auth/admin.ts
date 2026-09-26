import crypto from "node:crypto";
export function adminCredentials(){return {email:process.env.ADMIN_EMAIL||"",password:process.env.ADMIN_PASSWORD||""}}
export function createAdminToken(email:string){
 const secret=process.env.ADMIN_SESSION_SECRET;if(!secret)throw new Error("ADMIN_SESSION_SECRET is required");
 const payload=Buffer.from(JSON.stringify({email,exp:Date.now()+1000*60*60*12})).toString("base64url");
 const sig=crypto.createHmac("sha256",secret).update(payload).digest("base64url");
 return payload+"."+sig;
}
export function verifyAdminToken(token:string){
 try{const [payload,sig]=token.split(".");const secret=process.env.ADMIN_SESSION_SECRET;if(!secret||!payload||!sig)return false;
 const expected=crypto.createHmac("sha256",secret).update(payload).digest("base64url");
 if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;
 const data=JSON.parse(Buffer.from(payload,"base64url").toString()) as {email:string;exp:number};
 return !!data.email&&data.exp>Date.now();
 }catch{return false}
}
