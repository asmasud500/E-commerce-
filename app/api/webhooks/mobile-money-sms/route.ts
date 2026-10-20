import {NextResponse} from "next/server";

/**
 * Personal-number SMS forwarding is not an approved merchant payment source.
 * Keep the legacy endpoint closed so forwarded Send Money receipts can never
 * mark an order as paid. Only the configured merchant provider callback may
 * settle online payments.
 */
export async function POST(){
 return NextResponse.json({
  error:"Personal-number SMS payment confirmation is disabled. Complete payment through the secure merchant checkout."
 },{status:410,headers:{"Cache-Control":"no-store"}});
}
