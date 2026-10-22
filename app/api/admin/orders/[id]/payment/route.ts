import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { confirmPaymentAtomically, rejectPendingOrderAtomically } from "@/lib/firestore";
import { readAdminSession } from "@/lib/auth/admin";
import { notifyStatus, sendPaidOrderTelegram } from "@/lib/notifications/telegram-admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await readAdminSession(req.cookies.get("admin_session")?.value || "");
  if (!session) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    if (action !== "confirm" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const current = await db.order.findUnique({
      where: { id },
      select: {
        id: true, paymentStatus: true, paymentGatewayId: true, total: true,
        paymentReference: true, status: true, paymentProofSubmittedAt: true,
        paymentProvider: true
      }
    });
    if (!current || current.paymentStatus !== "PENDING" || current.status !== "PENDING") {
      return NextResponse.json({ error: "Order already processed or not found." }, { status: 409 });
    }

    if (action === "confirm") {
      // Admin confirmation must still be based on a submitted payment reference
      // and proof/provider evidence. The native transaction rechecks this evidence.
      if (!current.paymentGatewayId || !current.paymentReference ||
          (!current.paymentProofSubmittedAt && !current.paymentProvider)) {
        return NextResponse.json({ error: "Payment reference and proof evidence are required." }, { status: 409 });
      }
      const result = await confirmPaymentAtomically({
        orderId: id,
        gatewayId: current.paymentGatewayId,
        providerTransactionId: String(current.paymentReference),
        reference: String(current.paymentReference),
        amount: Number(current.total),
        rawResponse: { source: "admin_dashboard_confirmation" },
        expectedPaymentReference: String(current.paymentReference),
        requirePaymentEvidence: true,
        auditAction: "ADMIN_PAYMENT_CONFIRMED"
      });
      if (!result.confirmed) {
        return NextResponse.json({ error: result.reason === "duplicate_transaction"
          ? "This transaction has already been processed."
          : "Order was already updated or payment evidence changed." }, { status: 409 });
      }
      try { await sendPaidOrderTelegram(id, "Admin dashboard"); } catch {}
      return NextResponse.json({ ok: true, status: "CONFIRMED" });
    }

    const result = await rejectPendingOrderAtomically(id);
    if (!result.rejected) {
      return NextResponse.json({ error: "Order already processed or not found." }, { status: 409 });
    }
    try { await notifyStatus(id); } catch {}
    return NextResponse.json({ ok: true, status: "CANCELLED" });
  } catch (error) {
    console.error("Admin payment action failed:", error instanceof Error ? error.message : String(error));
    const e = error as { code?: string };
    if (e.code === "P2002") {
      return NextResponse.json({ error: "This transaction has already been processed." }, { status: 409 });
    }
    return NextResponse.json({ error: "Payment update failed." }, { status: 400 });
  }
}
