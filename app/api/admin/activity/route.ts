import {NextResponse} from "next/server";
import {db} from "@/lib/firestore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, actorId: true, action: true, entity: true, entityId: true, metadata: true, createdAt: true }
    });
    return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin activity query failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Unable to load activity history." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
