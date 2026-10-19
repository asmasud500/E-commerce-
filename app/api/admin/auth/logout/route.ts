import {NextRequest,NextResponse} from "next/server";

function hasValidSameOrigin(req: NextRequest) {
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.nextUrl.host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!hasValidSameOrigin(req)) {
    return NextResponse.json({error:"Cross-origin admin logout is not allowed."},{status:403});
  }
  const res = NextResponse.json({ok:true});
  res.cookies.set("admin_session","",{
    httpOnly:true,
    secure:process.env.NODE_ENV==="production",
    sameSite:"lax",
    path:"/",
    maxAge:0
  });
  return res;
}
