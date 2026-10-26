import {NextResponse} from "next/server";
import {db} from "@/lib/firestore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const start = new Date(today); start.setDate(start.getDate() - 6);

    const [allOrders, products, customers, lowStockCandidates, transactions] = await Promise.all([
      db.order.findMany({
        select: { id: true, createdAt: true, total: true, paymentStatus: true, status: true }
      }),
      db.product.findMany({ select: { id: true } }),
      db.user.findMany({ where: { role: "CUSTOMER" }, select: { id: true } }),
      db.product.findMany({
        where: { published: true },
        select: { id: true, name: true, sku: true, stock: true, lowStockThreshold: true },
        orderBy: { stock: "asc" }
      }),
      db.paymentTransaction.findMany({ select: { id: true } })
    ]);

    const saleEligible = (o: any) => o.status !== "CANCELLED" && o.status !== "REFUNDED";
    const paidOrders = allOrders.filter((o: any) => o.paymentStatus === "PAID" && saleEligible(o));
    const lowStockProducts = lowStockCandidates.filter((p: any) => Number(p.stock) <= Number(p.lowStockThreshold ?? 5)).slice(0, 20);
    const pending = allOrders.filter((o: any) => o.status === "PENDING").length;
    const daily = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d.toISOString().slice(0, 10), orders: 0, paidRevenue: 0 };
    });

    const statuses = new Map<string, number>();
    for (const order of allOrders as any[]) {
      statuses.set(order.status || "UNKNOWN", (statuses.get(order.status || "UNKNOWN") || 0) + 1);
      const created = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
      if (created >= start) {
        const day = daily.find(item => item.date === created.toISOString().slice(0, 10));
        if (day) {
          day.orders += 1;
          if (order.paymentStatus === "PAID" && saleEligible(order)) day.paidRevenue += Number(order.total || 0);
        }
      }
    }

    return NextResponse.json({
      summary: {
        orders: allOrders.length,
        products: products.length,
        customers: customers.length,
        pending,
        paidRevenue: paidOrders.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0),
        transactions: transactions.length
      },
      daily,
      lowStock: lowStockProducts,
      statuses: Array.from(statuses, ([status, count]) => ({ status, count }))
    });
  } catch (error) {
    console.error("Admin reports API failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Unable to generate reports" }, { status: 500 });
  }
}
