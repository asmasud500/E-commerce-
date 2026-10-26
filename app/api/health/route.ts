import { NextResponse } from "next/server";
import { db } from "@/lib/firestore";

/**
 * Public, non-sensitive readiness probe.
 * Reports only whether the app can reach its configured Firestore adapter.
 * Never returns project IDs, credentials, database contents, or exception details.
 */
export async function GET() {
  try {
    await db.storeSetting.findUnique({ where: { id: "store" }, select: { id: true } });
    return NextResponse.json(
      { status: "ok", database: "reachable", timestamp: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { status: "error", database: "unavailable", timestamp: new Date().toISOString() },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
