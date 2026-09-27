import {NextResponse} from "next/server";
import {db} from "@/lib/prisma";

export async function GET(){
 const products=await db.product.findMany({
  where:{published:true,stock:{gt:0}},
  include:{category:true},
  orderBy:{createdAt:"desc"}
 });
 return NextResponse.json(products);
}