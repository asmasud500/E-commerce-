import {NextResponse} from "next/server";
import {db} from "@/lib/prisma";

export async function GET() {
  const users = await db.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true, name: true, email: true, createdAt: true,
      _count: { select: { orders: true, reviews: true } },
      orders: { select: { total: true, paymentStatus: true }, take: 100 }
    }
  });
  return NextResponse.json(users.map((u) => ({
    id: u.id, name: u.name, email: u.email, createdAt: u.createdAt,
    orderCount: u._count.orders, reviewCount: u._count.reviews,
    paidSpend: u.orders.filter(o => o.paymentStatus === "PAID").reduce((sum, o) => sum + Number(o.total), 0)
  })));
}