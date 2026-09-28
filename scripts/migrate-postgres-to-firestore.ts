import {PrismaClient} from "@prisma/client";
import {db} from "../lib/firestore";

const prisma=new PrismaClient();
const n=(v:any)=>v==null?null:Number(v);
const json=(v:any)=>v==null?null:v;

async function main(){
  console.log("Reading PostgreSQL...");
  const [users,categories,products,images,wishlists,reviews,gateways,orders,transactions,reservations,items,coupons,audits]=await Promise.all([
    prisma.user.findMany(),prisma.category.findMany(),prisma.product.findMany(),prisma.productImage.findMany(),
    prisma.wishlistItem.findMany(),prisma.review.findMany(),prisma.paymentGateway.findMany(),prisma.order.findMany(),
    prisma.paymentTransaction.findMany(),prisma.stockReservation.findMany(),prisma.orderItem.findMany(),prisma.coupon.findMany(),prisma.auditLog.findMany()
  ]);
  for(const x of users)await db.user.create({data:{...x}});
  for(const x of categories)await db.category.create({data:{...x}});
  for(const x of products)await db.product.create({data:{...x,price:n(x.price),compareAtPrice:n(x.compareAtPrice),salePrice:n(x.salePrice)}});
  for(const x of images)await db.productImage.create({data:{...x}});
  for(const x of wishlists)await db.wishlistItem.create({data:{...x}});
  for(const x of reviews)await db.review.create({data:{...x}});
  for(const x of gateways)await db.paymentGateway.create({data:{...x,publicConfig:json(x.publicConfig)}});
  for(const x of orders)await db.order.create({data:{...x,subtotal:n(x.subtotal),shippingFee:n(x.shippingFee),discount:n(x.discount),total:n(x.total)}});
  for(const x of transactions)await db.paymentTransaction.create({data:{...x,amount:n(x.amount),rawResponse:json(x.rawResponse)}});
  for(const x of reservations)await db.stockReservation.create({data:{...x}});
  for(const x of items)await db.orderItem.create({data:{...x,unitPrice:n(x.unitPrice),lineTotal:n(x.lineTotal)}});
  for(const x of coupons)await db.coupon.create({data:{...x,value:n(x.value),minOrder:n(x.minOrder)}});
  for(const x of audits)await db.auditLog.create({data:{...x,metadata:json(x.metadata)}});
  console.log(JSON.stringify({users:users.length,categories:categories.length,products:products.length,images:images.length,wishlists:wishlists.length,reviews:reviews.length,gateways:gateways.length,orders:orders.length,transactions:transactions.length,reservations:reservations.length,items:items.length,coupons:coupons.length,audits:audits.length},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());
