import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";
import {recordAdminAudit} from "@/lib/auth/audit";

const schema=z.object({
  storeName:z.string().trim().min(1).max(120).optional(),
  logoUrl:z.string().trim().max(1000).refine(v=>v===""||/^https:\/\/[^\s]+$/.test(v),"Logo URL must be HTTPS.").optional(),
  heroBadge:z.string().trim().max(80).optional(),
  heroTitle:z.string().trim().max(120).optional(),
  heroBigText:z.string().trim().max(100).optional(),
  heroDescription:z.string().trim().max(300).optional(),
  heroCtaLabel:z.string().trim().max(60).optional(),
  heroCtaHref:z.string().trim().max(300).refine(v=>v===""||v.startsWith("/")||/^https:\/\/[^\s]+$/.test(v),"Hero button destination must be a site path or HTTPS URL.").optional(),
  offersHeading:z.string().trim().max(100).optional(),
  offersDescription:z.string().trim().max(200).optional(),
  flashSaleHeading:z.string().trim().max(100).optional(),
  featuredStoresHeading:z.string().trim().max(100).optional(),
  trendingHeading:z.string().trim().max(100).optional(),
  newArrivalsHeading:z.string().trim().max(100).optional(),
  justForYouHeading:z.string().trim().max(100).optional(),
  showBenefits:z.boolean().optional(),
  showPromotions:z.boolean().optional(),
  showFlashSale:z.boolean().optional(),
  showFeaturedStores:z.boolean().optional(),
  showTrending:z.boolean().optional(),
  showNewArrivals:z.boolean().optional(),
  showRecommendations:z.boolean().optional(),
  headerSearchPlaceholder:z.string().trim().max(120).optional(),
  headerFeaturedLabel:z.string().trim().max(50).optional(),
  headerNewArrivalsLabel:z.string().trim().max(50).optional(),
  headerDealsLabel:z.string().trim().max(50).optional(),
  deliveryNotice:z.string().trim().max(120).optional(),
  footerShopHeading:z.string().trim().max(60).optional(),
  footerAccountHeading:z.string().trim().max(60).optional(),
  footerSupportHeading:z.string().trim().max(60).optional(),
  seoTitle:z.string().trim().max(160).optional(),
  seoDescription:z.string().trim().max(300).optional(),
  seoKeywords:z.string().trim().max(300).optional(),
  supportEmail:z.string().trim().email().max(160).or(z.literal("")).optional(),
  supportPhone:z.string().trim().max(40).optional(),
  currency:z.enum(["BDT"]).optional(),
  defaultDeliveryFee:z.coerce.number().min(0).max(100000).optional(),
  freeShippingThreshold:z.coerce.number().min(0).max(10000000).nullable().optional(),
  taxEnabled:z.boolean().optional(),
  taxRate:z.coerce.number().min(0).max(100).optional(),
  announcement:z.string().trim().max(500).optional(),
  tagline:z.string().trim().max(160).optional(),
  brandColor:z.string().trim().regex(/^#[0-9a-fA-F]{6}$/,"Use a hex colour like #131921").optional(),
  accentColor:z.string().trim().regex(/^#[0-9a-fA-F]{6}$/,"Use a hex colour like #ff6801").optional(),
  address:z.string().trim().max(300).optional(),
  whatsapp:z.string().trim().max(40).optional(),
  facebookUrl:z.string().trim().max(300).refine(v=>v===""||/^https:\/\/[^\s]+$/.test(v),"Facebook link must start with https://").optional(),
  instagramUrl:z.string().trim().max(300).refine(v=>v===""||/^https:\/\/[^\s]+$/.test(v),"Instagram link must start with https://").optional(),
  youtubeUrl:z.string().trim().max(300).refine(v=>v===""||/^https:\/\/[^\s]+$/.test(v),"YouTube link must start with https://").optional(),
  openingHours:z.string().trim().max(200).optional(),
  contactIntro:z.string().trim().max(300).optional(),
  aboutIntro:z.string().trim().max(300).optional(),
  aboutBody:z.string().trim().max(5000).optional(),
  footerNote:z.string().trim().max(200).optional(),
  copyrightText:z.string().trim().max(200).optional(),
  privacyContent:z.string().max(10000).optional(),
  termsContent:z.string().max(10000).optional(),
  returnsContent:z.string().max(10000).optional(),
  shippingContent:z.string().max(10000).optional()
}).strip();

const defaults={id:"store",storeName:"MART Store",logoUrl:"",heroBadge:"Limited-time deals",heroTitle:"Mega Flash Sale",heroBigText:"Up to 70% Off",heroDescription:"Selected products at their lowest prices. Grab them before stock runs out.",heroCtaLabel:"Shop flash deals",heroCtaHref:"",offersHeading:"Offers & Highlights",offersDescription:"Discover the latest deals from our store.",flashSaleHeading:"Flash Sale",featuredStoresHeading:"Featured Stores",trendingHeading:"Trending Now",newArrivalsHeading:"New Arrivals",justForYouHeading:"Just For You",showBenefits:true,showPromotions:true,showFlashSale:true,showFeaturedStores:true,showTrending:true,showNewArrivals:true,showRecommendations:true,headerSearchPlaceholder:"Search for products, brands and more",headerFeaturedLabel:"Featured",headerNewArrivalsLabel:"New Arrivals",headerDealsLabel:"Deals & Offers",deliveryNotice:"Shopping across Bangladesh",footerShopHeading:"Shop",footerAccountHeading:"Your account",footerSupportHeading:"Customer support",seoTitle:"",seoDescription:"",seoKeywords:"",supportEmail:"",supportPhone:"",currency:"BDT",defaultDeliveryFee:120,freeShippingThreshold:3000,taxEnabled:false,taxRate:0,announcement:"",tagline:"Quality products, simple shopping.",brandColor:"#131921",accentColor:"#ff6801",address:"",whatsapp:"",facebookUrl:"",instagramUrl:"",youtubeUrl:"",openingHours:"",contactIntro:"",aboutIntro:"",aboutBody:"",footerNote:"",copyrightText:"",privacyContent:"",termsContent:"",returnsContent:"",shippingContent:""};

export async function GET(){
  try{
    const row=await db.storeSetting.findUnique({where:{id:"store"}});
    return NextResponse.json({...defaults,...(row||{})});
  }catch(error){
    console.error("Admin store settings GET failed:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Unable to load store settings."},{status:500});
  }
}

export async function PUT(req:NextRequest){
  try{
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:"Invalid store settings.",details:parsed.error.flatten()},{status:400});
    const existing=await db.storeSetting.findUnique({where:{id:"store"}});
    const data={...parsed.data,updatedAt:new Date()};
    const row=existing
      ? await db.storeSetting.update({where:{id:"store"},data})
      : await db.storeSetting.create({data:{...defaults,...data,id:"store"}});
    await recordAdminAudit(req,{action:"STORE_SETTINGS_UPDATED",entity:"storeSetting",entityId:"store",metadata:{changedFields:Object.keys(parsed.data)}});
    return NextResponse.json({...defaults,...row});
  }catch(error){
    console.error("Admin store settings PUT failed:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Unable to save store settings."},{status:500});
  }
}
