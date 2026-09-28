import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {verifyCustomerToken} from "@/lib/auth/customer";

type OrderItemRow = {
  unitPrice: number | string;
  lineTotal: number | string;
  [key: string]: unknown;
};

type OrderRow = {
  subtotal: number | string;
  shippingFee: number | string;
  discount: number | string;
  total: number | string;
  items: OrderItemRow[];
  [key: string]: unknown;
};

export async function GET(req:NextRequest){
  const token=req.cookies.get("customer_session")?.value;
  const s=token?await verifyCustomerToken(token):null;
  if(!s)return NextResponse.json({error:"Unauthorized"},{status:401});

  const orders=await db.order.findMany({
    where:{userId:s.userId},
    include:{items:true,paymentGateway:{select:{name:true,type:true}}},
    orderBy:{createdAt:"desc"},
    take:50
  }) as OrderRow[];

  return NextResponse.json(orders.map((o:OrderRow)=>({
    ...o,
    subtotal:Number(o.subtotal),
    shippingFee:Number(o.shippingFee),
    discount:Number(o.discount),
    total:Number(o.total),
    items:o.items.map((i:OrderItemRow)=>({
      ...i,
      unitPrice:Number(i.unitPrice),
      lineTotal:Number(i.lineTotal)
    }))
  })));
}
