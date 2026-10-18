import {NextResponse} from "next/server";
import {db} from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Use findMany and calculate aggregates in application code because the
    // current Firestore compatibility adapter does not implement Prisma groupBy
    // or relation _count projections.
    const [users, orders, reviews] = await Promise.all([
      db.user.findMany({
        where: { role: "CUSTOMER" },
        orderBy: { createdAt: "desc" },
        take: 500,
        select: { id: true, name: true, email: true, createdAt: true }
      }),
      db.order.findMany({
        where: { paymentStatus: "PAID" },
        select: { id: true, userId: true, total: true }
      }),
      db.review.findMany({ select: { id: true, userId: true } })
    ]);

    const spendByUser = new Map<string, number>();
    const orderCountByUser = new Map<string, number>();
    const reviewCountByUser = new Map<string, number>();

    for (const order of orders) {
      if (!order.userId) continue;
      spendByUser.set(order.userId, (spendByUser.get(order.userId) || 0) + Number(order.total || 0));
      orderCountByUser.set(order.userId, (orderCountByUser.get(order.userId) || 0) + 1);
    }
    for (const review of reviews) {
      if (review.userId) reviewCountByUser.set(review.userId, (reviewCountByUser.get(review.userId) || 0) + 1);
    }

    return NextResponse.json(users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      orderCount: orderCountByUser.get(user.id) || 0,
      reviewCount: reviewCountByUser.get(user.id) || 0,
      paidSpend: spendByUser.get(user.id) || 0
    })));
  } catch (error) {
    console.error("Admin customers API failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Unable to load customer data" }, { status: 500 });
  }
}
