const enc=new TextEncoder();
function b64(v:Uint8Array){let s="";for(const b of v)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
async function sign(value:string){const secret=process.env.ADMIN_SESSION_SECRET;if(!secret)throw new Error("ADMIN_SESSION_SECRET is required");const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);return b64(new Uint8Array(await crypto.subtle.sign("HMAC",key,enc.encode(value))))}
export async function createOrderAccessToken(orderId:string){return orderId+"."+await sign("order:"+orderId)}
export async function verifyOrderAccessToken(orderId:string,token:string){try{return token===await createOrderAccessToken(orderId)}catch{return false}}
