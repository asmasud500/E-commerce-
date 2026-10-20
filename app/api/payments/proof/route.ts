import {NextResponse} from "next/server";

/**
 * Manual transaction-ID, sender-last-four, and screenshot submissions are
 * intentionally disabled. Payment must be verified by the merchant gateway.
 */
export async function POST(){
 return NextResponse.json({
  error:"Manual payment proof is disabled. Please pay through the secure merchant checkout; successful payments are verified automatically by the provider."
 },{status:410,headers:{"Cache-Control":"no-store"}});
}
