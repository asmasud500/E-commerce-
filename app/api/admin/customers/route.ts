import {NextResponse} from "next/server";
import {db} from "@/lib/prisma";

export async function GET() {
  const [users, paidTotals] = await Promise.all([
    db.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true, name: true, email: true, createdAt: true,
        _count: { select: { orders: true, reviews: true } }
      }
    }),
    db.order.groupBy({
      by: ["userId"],
      where: { userId: { not: null }, paymentStatus: "PAID" },
      _sum: { total: true }
    })
  ]);
  const spendByUser = new Map(paidTotals.map(row => [row.userId, Number(row._sum.total || 0)]));
  return NextResponse.json(users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    orderCount: user._count.orders,
    reviewCount: user._count.reviews,
    paidSpend: spendByUser.get(user.id) || 0
  })));
}