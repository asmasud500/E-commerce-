import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/prisma";
import { AI_FEATURES, geminiGenerate, getAiSettings, recordAiRequest, safeAiError, type AiFeature } from "@/lib/ai/gemini";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  input: z.string().trim().max(4000).optional(),
  productId: z.string().trim().max(100).optional(),
  productName: z.string().trim().max(200).optional(),
  tone: z.enum(["professional", "friendly", "premium", "concise"]).optional(),
  language: z.enum(["Bangla", "English", "Bangla and English"]).optional(),
  dateRange: z.enum(["7", "30", "90"]).optional(),
  conversation: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(2000) })).max(8).optional()
});

const publicRate = new Map<string, { count: number; until: number }>();
function allowedRequest(key: string) {
  const now = Date.now();
  const current = publicRate.get(key);
  if (!current || current.until < now) { publicRate.set(key, { count: 1, until: now + 60_000 }); return true; }
  if (current.count >= 12) return false;
  current.count++;
  return true;
}
function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}
function words(s: string) { return s.toLowerCase().normalize("NFKC").split(/[^\p{L}\p{N}]+/u).filter(x => x.length > 1); }
function rankProducts(products: any[], query: string) {
  const tokens = words(query);
  return products.map(p => {
    const hay = [p.name, p.description, p.sku, p.brand, p.category?.name].filter(Boolean).join(" ").toLowerCase();
    const score = tokens.reduce((sum, token) => sum + (String(p.name || "").toLowerCase().includes(token) ? 4 : 0) + (hay.includes(token) ? 1 : 0), 0);
    return { p, score };
  }).filter(x => x.score > 0).sort((a,b) => b.score-a.score).slice(0, 8).map(({p}) => ({
    id:p.id, name:p.name, description:String(p.description||"").slice(0,450),
    price:Number(p.salePrice ?? p.price ?? 0), currency:"BDT", stock:Number(p.stock||0),
    category:p.category?.name || null, slug:p.slug || null,
    images:Array.isArray(p.images)?p.images.slice(0,1).map((i:any)=>i.url):[]
  }));
}
async function getCatalog() {
  const [products, categories, images] = await Promise.all([
    db.product.findMany({ where: { published: true }, take: 300 }),
    db.category.findMany({}),
    db.productImage.findMany({ take: 600, orderBy: { sortOrder: "asc" } })
  ]);
  const categoryById = new Map((categories as any[]).map(c=>[c.id,c]));
  const imagesById = new Map<string,any[]>();
  for (const image of images as any[]) { const arr=imagesById.get(image.productId)||[]; arr.push(image); imagesById.set(image.productId,arr); }
  return (products as any[]).map(p=>({...p,category:categoryById.get(p.categoryId)||null,images:imagesById.get(p.id)||[]}));
}
async function saveDraft(feature: string, title: string, content: string, actor: string, metadata: Record<string, unknown> = {}) {
  return db.aiDraft.create({ data: {
    feature, title: title.slice(0,180), content: content.slice(0,16000),
    status: "PENDING", createdBy: actor, metadata, createdAt: new Date(), updatedAt: new Date()
  } });
}

export async function POST(req: NextRequest, context: { params: Promise<{ feature: string }> }) {
  const { feature } = await context.params;
  if (!(AI_FEATURES as readonly string[]).includes(feature)) return errorResponse("NOT_FOUND", "Unknown AI feature.", 404);
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowedRequest(feature + ":" + ip)) return errorResponse("RATE_LIMITED", "Too many AI requests. Please wait a minute and try again.", 429);
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorResponse("INVALID_INPUT", "Please check the submitted fields and try again.", 400);
  const input = parsed.data;
  const session = await readAdminSession(req.cookies.get("admin_session")?.value || "");
  const adminOnly = ["product-description", "sales-analyst", "marketing-studio"].includes(feature);
  if (adminOnly && !session) return errorResponse("ADMIN_REQUIRED", "Admin authentication is required for this feature.", 401);
  if (feature === "sales-analyst" && session && !["SUPER_ADMIN", "MANAGER"].includes(session.role)) return errorResponse("FORBIDDEN", "Your role cannot access sales analysis.", 403);
  const settings = await getAiSettings();
  if (settings.enabled === false || settings.features?.[feature] === false) return errorResponse("AI_FEATURE_DISABLED", "This AI feature is currently disabled by the store administrator.", 503);
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const usedToday = await db.aiRequestLog.count({ where: { createdAt: { gte: today } } }).catch(() => 0);
    if (usedToday >= Number(settings.dailyRequestLimit || 300)) return errorResponse("DAILY_LIMIT_REACHED", "The store's daily AI request limit has been reached. Try again tomorrow.", 429);

    let prompt = "";
    let draftTitle = "";
    let draftMetadata: Record<string, unknown> = {};
    let resultProducts: any[] | undefined;
    const catalog = (feature === "smart-search" || feature === "shopping-assistant" || feature === "customer-support") ? await getCatalog() : [];

    if (feature === "product-description" || feature === "marketing-studio") {
      const product = input.productId ? await db.product.findUnique({ where: { id: input.productId } }) : null;
      if (feature === "product-description" && !product && !input.productName) return errorResponse("PRODUCT_REQUIRED", "Choose a product or provide a product name.", 400);
      if (feature === "product-description") {
        const p = product || { name: input.productName, description: input.input || "", price: null, sku: null };
        prompt = "Create an accurate, conversion-friendly product listing using only the supplied facts. Do not invent specifications, warranty, stock, shipping time, origin, certifications, or claims. Include a short title, description, 4-6 benefit bullets, and SEO title/meta description. Return plain text. Language: "+(input.language||"Bangla and English")+"; tone: "+(input.tone||"professional")+". Product facts: "+JSON.stringify({name:p.name,description:p.description,price:p.price,sku:p.sku,categoryId:p.categoryId,stock:p.stock,options:p.options,variants:p.variants,extraNotes:input.input||""});
        draftTitle = "Product description — " + String(p.name || input.productName);
        draftMetadata = { productId: product?.id || null };
      } else {
        prompt = "Create a practical marketing campaign draft for a Bangladesh e-commerce store. Include campaign concept, audience, 3 social captions, one short ad headline, CTA and a 7-day content schedule. Do not claim discounts or product facts unless supplied. Language: "+(input.language||"Bangla and English")+"; tone: "+(input.tone||"friendly")+". Brief: "+(input.input||"General store awareness campaign")+"; selected product facts: "+JSON.stringify(product ? {name:product.name,description:product.description,price:product.price,salePrice:product.salePrice} : {});
        draftTitle = "Marketing campaign — " + (input.productName || "Store campaign");
        draftMetadata = { productId: product?.id || null };
      }
    } else if (feature === "smart-search") {
      const q = input.input || "";
      resultProducts = rankProducts(catalog, q);
      prompt = "Rewrite this product search as a short query intent phrase, preserving the customer's language. Do not invent products. Query: "+q+"\nCandidate catalog (for context only): "+JSON.stringify(resultProducts.map(p=>({name:p.name,category:p.category})));
    } else if (feature === "customer-support") {
      const matches = rankProducts(catalog, input.input || "");
      prompt = "Answer the customer's store/product question using only the available catalog facts below. If the answer needs a store policy, delivery estimate, payment status, or order-specific data that is not present, clearly say you cannot verify it and direct them to contact store support. Never ask for OTP/password/card details. Customer message: "+(input.input||"")+"\nRelevant catalog facts: "+JSON.stringify(matches);
    } else if (feature === "shopping-assistant") {
      const matches = rankProducts(catalog, input.input || "");
      resultProducts = matches;
      prompt = "Help the shopper choose from the supplied products. Explain differences briefly and make recommendations only from these facts. Do not claim products are suitable for health/safety-critical needs. If there are no matches, ask one clarifying question. Customer request: "+(input.input||"")+"\nProduct candidates: "+JSON.stringify(matches);
    } else {
      const rangeDays = Number(input.dateRange || "30");
      const since = new Date(Date.now() - rangeDays * 86400000);
      const orders = await db.order.findMany({ where: { createdAt: { gte: since } }, take: 1000 });
      const rows = orders as any[];
      const paid = rows.filter(o => String(o.paymentStatus).toUpperCase() === "PAID");
      const totalRevenue = paid.reduce((s,o)=>s+Number(o.total||0),0);
      const statusCounts: Record<string,number> = {};
      for (const o of rows) statusCounts[String(o.status||"UNKNOWN")] = (statusCounts[String(o.status||"UNKNOWN")]||0)+1;
      const facts = { rangeDays, generatedAt: new Date().toISOString(), sourceOrderCount: rows.length, paidOrderCount: paid.length, paidRevenueBDT: Math.round(totalRevenue*100)/100, averagePaidOrderValueBDT: paid.length ? Math.round(totalRevenue/paid.length*100)/100 : 0, orderStatuses: statusCounts, note: "Aggregated server-side from order records; no customer names, emails, addresses, payment secrets, or raw transactions included." };
      prompt = "Analyze this verified aggregate e-commerce data. Explain trends only where data supports them, flag small samples and missing context, provide 3 actionable recommendations and 3 follow-up metrics. Never invent missing values or claim causality. Report window: "+rangeDays+" days. Data: "+JSON.stringify(facts);
      draftTitle = "Sales analysis — last "+rangeDays+" days";
      draftMetadata = { rangeDays, sourceOrderCount: rows.length, paidOrderCount: paid.length };
    }

    const generated = await geminiGenerate({ feature: feature as AiFeature, prompt });
    let draft: any = null;
    if (["product-description","marketing-studio","sales-analyst"].includes(feature)) {
      draft = await saveDraft(feature, draftTitle, generated.text, session?.email || "admin", draftMetadata);
    }
    await recordAiRequest({ feature, model: generated.model, status: "SUCCESS", latencyMs: generated.latencyMs, inputTokens: generated.inputTokens, outputTokens: generated.outputTokens, actorType: session ? "admin" : "visitor", draftId: draft?.id });
    return NextResponse.json({ text: generated.text, model: generated.model, latencyMs: generated.latencyMs, products: resultProducts, draft: draft ? { id: draft.id, status: draft.status, title: draft.title } : undefined }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const safe = safeAiError(error);
    await recordAiRequest({ feature, status: "ERROR", errorCode: safe.code, actorType: session ? "admin" : "visitor" });
    const status = safe.code === "AI_NOT_CONFIGURED" ? 503 : safe.code === "AI_FEATURE_DISABLED" ? 503 : safe.code === "AI_QUOTA_EXHAUSTED" ? 429 : 502;
    return errorResponse(safe.code, safe.message, status);
  }
}
