import {NextRequest,NextResponse} from "next/server";
import {rateLimit} from "@/lib/security/rate-limit";

/**
 * Manual transaction-ID, sender-last-four, and screenshot submissions are
 * intentionally disabled. Rate-limit even rejected legacy submissions.
 */
export async function POST(req:NextRequest){
 const ip=req.headers.get("cf-connecting-ip")||"unknown";
 const rl=rateLimit("payment-proof:"+ip,5,60_000);
 if(!rl.ok)return NextResponse.json({error:"Too many payment-proof attempts. Try again later."},{status:429,headers:{"Retry-After":String(rl.retryAfter),"Cache-Control":"no-store"}});
 return NextResponse.json({
  error:"Manual payment proof is disabled. Please pay through the secure merchant checkout; successful payments are verified automatically by the provider."
 },{status:410,headers:{"Cache-Control":"no-store"}});
}
