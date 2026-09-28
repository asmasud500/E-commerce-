import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title:{default:"Store — Quality products, simple shopping",template:"%s | Store"},
  description:"Shop quality products with a smooth catalog, secure checkout, flexible payment options and reliable order tracking.",
  keywords:["ecommerce","online store","shopping","Bangladesh"],
  robots:{index:true,follow:true},
  openGraph:{title:"Store — Quality products, simple shopping",description:"Discover quality products and enjoy a simple shopping experience.",type:"website"},
  twitter:{card:"summary_large_image",title:"Store",description:"Quality products, simple shopping."},
};

export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
