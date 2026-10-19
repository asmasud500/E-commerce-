import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName:"MART Store",
  title:{default:"MART Store — Online Shopping in Bangladesh",template:"%s | MART Store"},
  description:"Discover quality products, explore deals, shop by category and enjoy a smooth checkout with flexible payment options in Bangladesh.",
  keywords:["ecommerce","online store","online shopping Bangladesh","buy online Bangladesh","shopping deals","MART Store"],
  category:"shopping",
  robots:{index:true,follow:true},
  openGraph:{title:"MART Store — Online Shopping in Bangladesh",description:"Discover quality products, explore deals and enjoy a smooth online shopping experience.",type:"website",locale:"en_BD",siteName:"MART Store"},
  twitter:{card:"summary_large_image",title:"MART Store",description:"Quality products, simple shopping."},
};

export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
