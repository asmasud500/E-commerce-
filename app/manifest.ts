import type {MetadataRoute} from "next";
export default function manifest():MetadataRoute.Manifest{
  return {name:"MART Store",short_name:"MART",description:"Online shopping in Bangladesh",start_url:"/",display:"standalone",background_color:"#F5F5F7",theme_color:"#131921",icons:[{src:"/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any"}]};
}
