import {NextRequest} from "next/server";
import {db} from "@/lib/prisma";
import {readAdminSession} from "@/lib/auth/admin";

export async function recordAdminAudit(
 req: NextRequest,
 entry: { action: string; entity: string; entityId?: string | null; metadata?: Record<string, unknown> }
) {
 try {
  const session=await readAdminSession(req.cookies.get("admin_session")?.value||"");
  await db.auditLog.create({data:{
   actorId:session?.staffId||session?.email||null,
   action:entry.action,
   entity:entry.entity,
   entityId:entry.entityId||null,
   metadata:entry.metadata||{},
   createdAt:new Date()
  }});
 } catch (error) {
  console.error("Admin audit log write failed:",error instanceof Error?error.message:String(error));
 }
}
