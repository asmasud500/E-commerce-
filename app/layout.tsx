import type { Metadata, Viewport } from "next";
import "./globals.css";
import {loadBranding,brandCss} from "@/lib/store/branding";
import MobileNav from "@/components/MobileNav";

export const dynamic="force-dynamic";

export async function generateMetadata():Promise<Metadata>{
  const b=await loadBranding();
  const title=b.storeName+" — Online Shopping in Bangladesh";
  return {
    applicationName:b.storeName,
    title:{default:title,template:"%s | "+b.storeName},
    description:b.tagline+" Shop quality products with a smooth checkout and flexible payment options in Bangladesh.",
    keywords:["ecommerce","online store","online shopping Bangladesh","buy online Bangladesh","shopping deals",b.storeName],
    category:"shopping",
    robots:{index:true,follow:true},
    openGraph:{title,description:b.tagline,type:"website",locale:"en_BD",siteName:b.storeName},
    twitter:{card:"summary_large_image",title:b.storeName,description:b.tagline},
  };
}
export async function generateViewport():Promise<Viewport>{const b=await loadBranding();return {themeColor:b.brandColor,width:"device-width",initialScale:1}}

export default async function RootLayout({children}:{children:React.ReactNode}){
  const b=await loadBranding();
  return <html lang="en-BD"><head><style id="brand-theme" dangerouslySetInnerHTML={{__html:brandCss(b)}}/></head><body data-store-layout={b.layoutPreset} data-store-width={b.contentWidth}><a className="skip-link" href="#main-content">Skip to content</a>{children}<MobileNav/></body></html>
}
