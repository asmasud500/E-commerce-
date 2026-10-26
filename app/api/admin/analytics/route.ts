import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firestore";

export const dynamic = "force-dynamic";

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") ?? "7d";
  if (period !== "7d" && period !== "30d") {
    return NextResponse.json({ error: "period must be 7d or 30d." }, { status: 400 });
  }

  const now = new Date();
  const from = startOfDay(now);
  from.setDate(from.getDate() - (period === "7d" ? 6 : 29));

  try {
    const [orders, lowStockProducts] = await Promise.all([
      db.order.findMany({
        where: { createdAt: { gte: from, lte: now } },
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          status: true,
          paymentStatus: true,
          total: true,
          items: {
            select: { productId: true, name: true, quantity: true, lineTotal: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.product.findMany({
        where: { published: true, stock: { lte: 5 } },
        select: { id: true, name: true, sku: true, stock: true, lowStockThreshold: true },
        orderBy: { stock: "asc" },
        take: 20,
      }),
    ]);

    const daily = new Map<string, { orders: number; sales: number }>();
    for (let offset = 0; offset < (period === "7d" ? 7 : 30); offset += 1) {
      const day = new Date(from);
      day.setDate(from.getDate() + offset);
      daily.set(day.toISOString().slice(0, 10), { orders: 0, sales: 0 });
    }

    const bestSelling = new Map<string, { productId: string; name: string; quantity: number; revenue: number }>();
    const cancelledOrders: Array<{ orderNumber: string; createdAt: Date; total: number }> = [];
    let grossSales = 0;
    let paidSales = 0;

    for (const order of orders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      const day = daily.get(key);
      if (day) {
        day.orders += 1;
        if (order.status !== "CANCELLED" && order.status !== "REFUNDED") {
          const total = Number(order.total);
          day.sales += total;
        }
      }

      if (order.status === "CANCELLED") {
        cancelledOrders.push({
          orderNumber: order.orderNumber,
          createdAt: order.createdAt,
          total: Number(order.total),
        });
      } else if (order.status !== "REFUNDED") {
        grossSales += Number(order.total);
        if (order.paymentStatus === "PAID") paidSales += Number(order.total);
      }

      if (order.status !== "CANCELLED" && order.status !== "REFUNDED") {
        for (const item of order.items) {
          const current = bestSelling.get(item.productId) ?? {
            productId: item.productId,
            name: item.name,
            quantity: 0,
            revenue: 0,
          };
          current.quantity += item.quantity;
          current.revenue += Number(item.lineTotal);
          bestSelling.set(item.productId, current);
        }
      }
    }

    return NextResponse.json({
      period,
      from: from.toISOString(),
      to: now.toISOString(),
      summary: {
        orderCount: orders.length,
        grossSales: Number(grossSales.toFixed(2)),
        paidSales: Number(paidSales.toFixed(2)),
        cancelledCount: cancelledOrders.length,
        lowStockCount: lowStockProducts.length,
      },
      dailySales: [...daily.entries()].map(([date, values]) => ({
        date,
        orders: values.orders,
        sales: Number(values.sales.toFixed(2)),
      })),
      bestSellingProducts: [...bestSelling.values()]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)
        .map((item) => ({ ...item, revenue: Number(item.revenue.toFixed(2)) })),
      lowStockProducts: lowStockProducts.map((product) => ({
        ...product,
        threshold: product.lowStockThreshold,
      })),
      cancelledOrders: cancelledOrders.slice(0, 50),
    });
  } catch (error) {
    console.error("Admin analytics query failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Unable to load business analytics." }, { status: 500 });
  }
}
