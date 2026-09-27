import {NextRequest,NextResponse} from "next/server";

function payloadFromRequest(req:NextRequest){
  if(req.method==="GET") return Object.fromEntries(new URL(req.url).searchParams.entries());
  return null;
}

export async function GET(req:NextRequest){
  const payload=payloadFromRequest(req)||{};
  return NextResponse.redirect(new URL("/order-success?paid=false&order="+encodeURIComponent(String(payload.tran_id||"")),req.url));
}

export async function POST(req:NextRequest){
  const payload=Object.fromEntries(new URLSearchParams(await req.text()).entries());
  return NextResponse.redirect(new URL("/order-success?paid=false&order="+encodeURIComponent(String(payload.tran_id||"")),req.url));
}
