import crypto from "node:crypto";
const ALG="aes-256-gcm";
function key(){const raw=process.env.PAYMENT_ENCRYPTION_KEY;if(!raw)throw new Error("PAYMENT_ENCRYPTION_KEY is required");return crypto.createHash("sha256").update(raw).digest()}
export function encryptSecrets(value:Record<string,unknown>){const iv=crypto.randomBytes(12);const c=crypto.createCipheriv(ALG,key(),iv);const encrypted=Buffer.concat([c.update(JSON.stringify(value),"utf8"),c.final()]);const tag=c.getAuthTag();return [iv.toString("base64"),tag.toString("base64"),encrypted.toString("base64")].join(".")}
export function decryptSecrets(value:string){const [ivB,tagB,dataB]=value.split(".");const d=crypto.createDecipheriv(ALG,key(),Buffer.from(ivB,"base64"));d.setAuthTag(Buffer.from(tagB,"base64"));return JSON.parse(Buffer.concat([d.update(Buffer.from(dataB,"base64")),d.final()]).toString("utf8")) as Record<string,unknown>}
