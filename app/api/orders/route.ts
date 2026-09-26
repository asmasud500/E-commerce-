import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { z } from "zod";

const orderSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(8),
  customerEmail: z.string().email().optional().or(z.literal("")),
  shippingAddress: z.string().min(5),
  items: z.array(z.object({ productId: z.string(), quantity: z.coerce.number().int().positive() })).min(1)
});

export async function POST(request: NextRequest) {
  try {
    const input = orderSchema.parse(await request.json());
    const ids = input.items.map(i => i.productId);
    const products = await db.product.findMany({ where: { id: { in: ids }, published: true } });

    if (products.length !== ids.length) {
      return NextResponse.json({ error: "One or more products are unavailable." }, { status: 400 });
    }

    const byId = new Map(products.map(p => [p.id, p]));
    let subtotal = 0;
    const orderItems = [];

    for (const item of input.items) {
      const product = byId.get(item.productId)!;
      if (product.stock < item.quantity) {
        return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 });
      }
      const unitPrice = Number(product.price);
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      orderItems.push({ productId: product.id, name: product.name, unitPrice, quantity: item.quantity, lineTotal });
    }

    const shippingFee = subtotal >= 3000 ? 0 : 120;
    const total = subtotal + shippingFee;
    const orderNumber = "ORD-" + Date.now().toString(36).toUpperCase();

    const order = await db.$transaction(async tx => {
      const created = await tx.order.create({
        data: {
          orderNumber, customerName: input.customerName, customerPhone: input.customerPhone,
          customerEmail: input.customerEmail || null, shippingAddress: input.shippingAddress,
          subtotal, shippingFee, total,
          items: { create: orderItems }
        },
        include: { items: true }
      });
      for (const item of input.items) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } }
        });
        if (result.count !== 1) throw new Error("Stock changed during checkout");
      }
      return created;
    });

    return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber, total: Number(order.total) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Unable to create order. Please check your information and try again." }, { status: 400 });
  }
}
