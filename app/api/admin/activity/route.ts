import {NextResponse} from "next/server";
import {db} from "@/lib/prisma";

export async function GET() {
  const rows = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, actorId: true, action: true, entity: true, entityId: true, metadata: true, createdAt: true }
  });
  return NextResponse.json(rows);
}