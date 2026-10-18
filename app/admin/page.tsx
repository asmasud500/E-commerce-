export const dynamic="force-dynamic";
import {db} from "@/lib/prisma";
import AdminSidebar from "@/components/AdminSidebar";
const money=(n:number)=>"৳"+Number(n||0).toLocaleString("en-BD");
const modules=[
 {title:"Products & Inventory",desc:"Create/edit products, categories, price, stock and publish status.",href:"/admin/products",icon:"▣",tag:"Live data"},
 {title:"Orders & Invoices",desc:"Order queue, fulfilment status, payment proof, confirm/reject and refunds.",href:"/admin/orders",icon:"▤",tag:"Live data"},
 {title:"Customers",desc:"Search customer records, review purchase totals and export the customer directory.",href:"/admin/customers",icon:"♙",tag:"Live data"},
 {title:"Reviews & Moderation",desc:"Approve, unapprove or remove customer product reviews.",href:"/admin/reviews",icon:"☆",tag:"Live data"},
 {title:"Payments & Shipping",desc:"Configure payment gateways and inspect transaction verification records.",href:"/admin/payment-gateways",icon:"৳",tag:"Live data"},
 {title:"Coupons & Marketing",desc:"Create discount codes and manage active coupon rules.",href:"/admin/coupons",icon:"✦",tag:"Live data"},
 {title:"Categories",desc:"Maintain the store taxonomy used by product listings.",href:"/admin/categories",icon:"▦",tag:"Live data"},
 {title:"Reports & Activity",desc:"Seven-day sales activity, order status breakdown, low-stock alerts and CSV export.",href:"/admin/reports",icon:"▥",tag:"Live analytics"},
 {title:"Activity Log",desc:"Search recent audit records for order and store operations.",href:"/admin/activity",icon:"◷",tag:"Audit trail"},
 {title:"Store Settings",desc:"Edit store profile, delivery defaults, tax preferences and announcements.",href:"/admin/settings",icon:"⚙",tag:"Live settings"},
 {title:"Delivery Zones",desc:"Configure district delivery charges and estimated delivery times.",href:"/admin/delivery-zones",icon:"⌁",tag:"Firestore"},
 {title:"Store Banners",desc:"Manage banner images, links, order and visibility.",href:"/admin/banners",icon:"▧",tag:"Firestore"},
 {title:"Flash Sales",desc:"Schedule discounts against selected product IDs.",href:"/admin/flash-sales",icon:"✦",tag:"Firestore"},
];
export default async function AdminPage(){
 let orders=0,products=0,customers=0,pending=0,paidRevenue=0,recent:any[]=[];
 try{
  const result=await Promise.all([
   db.order.count(),db.product.count(),db.user.count({where:{role:"CUSTOMER"}}),
   db.order.count({where:{status:"PENDING"}}),
   db.order.aggregate({where:{paymentStatus:"PAID"},_sum:{total:true}}),
   db.order.findMany({orderBy:{createdAt:"desc"},take:5,select:{id:true,orderNumber:true,customerName:true,total:true,status:true,paymentStatus:true,createdAt:true}})
  ]);
  orders=result[0];products=result[1];customers=result[2];pending=result[3];paidRevenue=Number(result[4]?._sum?.total||0);recent=result[5]||[];
 }catch(error){console.error("Admin dashboard data error:",error instanceof Error?error.message:String(error));}
 return <div className="admin-layout"><AdminSidebar/><main className="admin-content">
  <div className="admin-kicker">MART · STORE CONTROL</div>
  <div className="admin-heading-row"><div><h1>Admin Command Center</h1><p>One primary workspace for your store operations.</p></div><a className="admin-primary-action" href="/">View storefront ↗</a></div>
  <div className="admin-stat-grid">
   {[["Total orders",String(orders),"All orders"],["Products",String(products),"Catalog inventory"],["Customers",String(customers),"Registered customers"],["Paid revenue",money(paidRevenue),"Verified paid orders"]].map(([label,value,note])=><article className="admin-stat" key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}
  </div>
  <section className="admin-alert"><div><span className="admin-alert-eyebrow">NEEDS ATTENTION</span><h2>{pending} pending order{pending===1?"":"s"}</h2><p>Open the order manager to review payments, proofs and fulfilment.</p></div><a href="/admin/orders">Review orders →</a></section>
  <div className="admin-section-heading"><div><h2>All admin modules</h2><p>Use one dashboard; existing secure tools and database-backed operations are retained.</p></div></div>
  <div className="admin-module-grid">{modules.map(m=><a className="admin-module-card" href={m.href} key={m.title}><div className="admin-module-top"><span className="admin-module-icon">{m.icon}</span><span className="admin-module-tag">{m.tag}</span></div><h3>{m.title}</h3><p>{m.desc}</p><span className="admin-module-link">Open module <b>→</b></span></a>)}</div>
  <section className="admin-recent"><div className="admin-section-heading"><div><h2>Recent orders</h2><p>Latest orders from the live database.</p></div><a href="/admin/orders">View all →</a></div>
   <div className="admin-table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr></thead><tbody>{recent.map(o=><tr key={o.id}><td><b>{o.orderNumber||o.id}</b></td><td>{o.customerName||"Customer"}</td><td>{money(Number(o.total))}</td><td>{o.paymentStatus||"—"}</td><td><span className="admin-status">{o.status||"—"}</span></td><td><a href="/admin/orders">Open</a></td></tr>)}</tbody></table>{!recent.length&&<p className="admin-empty">No recent orders found, or the database is currently unavailable.</p>}</div>
  </section>
  <p className="admin-footnote">This is the primary admin entry point. Product, order, gateway, transaction, coupon, category and review tools use the existing backend routes. Features without a production backend are not simulated as real operations.</p>
 </main></div>
}