import type {MetadataRoute} from "next";
import {loadBranding} from "@/lib/store/branding";
export const dynamic="force-dynamic";
export default async function manifest():Promise<MetadataRoute.Manifest>{
  const b=await loadBranding();
  return {name:b.storeName,short_name:b.storeName.slice(0,12),description:b.tagline,start_url:"/",display:"standalone",background_color:"#F5F5F7",theme_color:b.brandColor,icons:[{src:"/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any"}]};
}
