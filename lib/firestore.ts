import {getCloudflareContext} from "@opennextjs/cloudflare";

type AnyObj=Record<string,any>;

function cleanEnvValue(value:unknown){
  const s=String(value??"").trim();
  if(!s)return "";
  if((s.startsWith("\"")&&s.endsWith("\""))||(s.startsWith("\'")&&s.endsWith("\'")))return s.slice(1,-1).trim();
  return s;
}

async function envValue(name:string){
  try{
    const ctx=await getCloudflareContext({async:true});
    const bound=(ctx.env as Record<string,unknown>)[name];
    const value=cleanEnvValue(bound);
    if(value)return value;
  }catch{}
  try{return cleanEnvValue(process.env[name]);}catch{return "";}
}

async function serviceAccountValue(name:string,field:string){
  const raw=await envValue(name);
  if(raw.startsWith("{")){
    try{return String(JSON.parse(raw)[field]||"").trim();}catch{}
  }
  return raw;
}

let cachedToken:{token:string;exp:number}|null=null;

function b64url(input:ArrayBuffer|string){const bytes=typeof input==="string"?new TextEncoder().encode(input):new Uint8Array(input);let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function pemBytes(pem:string){const normalized=pem.trim().replace(/\\n/g,"\n").replace(/\\r/g,"\r");const b64=normalized.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,"");const bin=atob(b64);const a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a;}
async function accessToken(){
  const now=Math.floor(Date.now()/1000);
  if(cachedToken&&cachedToken.exp>now+60)return cachedToken.token;
  const email=await serviceAccountValue("FIREBASE_CLIENT_EMAIL","client_email");
  const keyPem=(await serviceAccountValue("FIREBASE_PRIVATE_KEY","private_key")).replace(/\\n/g,"\n").replace(/\\r/g,"\r").replace(/\r/g,"").trim();
  if(!email||!keyPem)throw new Error("Firebase service account is not configured");
  const header=b64url(JSON.stringify({alg:"RS256",typ:"JWT"}));
  const payload=b64url(JSON.stringify({iss:email,scope:"https://www.googleapis.com/auth/datastore",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600}));
  let key:CryptoKey;
  try{
    key=await crypto.subtle.importKey("pkcs8",pemBytes(keyPem),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
  }catch(error){
    throw new Error("Firebase private key is invalid: "+String(error));
  }
  const sig=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(`${header}.${payload}`));
  const assertion=`${header}.${payload}.${b64url(sig)}`;
  const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:`grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${encodeURIComponent(assertion)}`});
  if(!r.ok){const detail=await r.text();throw new Error(`Google token error ${r.status}: ${detail.slice(0,300)}`);}
  const j:any=await r.json();
  if(!j.access_token)throw new Error("Google token response did not contain access_token");
  cachedToken={token:j.access_token,exp:now+Number(j.expires_in||3600)};
  return j.access_token;
}
async function req(path:string,init:RequestInit={}){
  const token=await accessToken();
  const project=await serviceAccountValue("FIREBASE_PROJECT_ID","project_id");if(!project)throw new Error("FIREBASE_PROJECT_ID is required");
  const base=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
  const r=await fetch(`${base}${path}`,{...init,headers:{authorization:`Bearer ${token}`,"content-type":"application/json",...(init.headers||{})}});
  if(!r.ok){const t=await r.text();throw new Error(`Firestore ${r.status}: ${t.slice(0,1000)}`)}
  return r.status===204?null:r.json();
}
function enc(v:any):any{if(v===null||v===undefined)return {nullValue:null};if(v instanceof Date)return {timestampValue:v.toISOString()};if(typeof v==="string")return {stringValue:v};if(typeof v==="boolean")return {booleanValue:v};if(typeof v==="number")return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};if(Array.isArray(v))return {arrayValue:{values:v.map(enc)}};if(typeof v==="object")return {mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,enc(x)]))}};return {stringValue:String(v)};}
function dec(v:any):any{if(!v)return null;if("nullValue"in v)return null;if("stringValue"in v)return v.stringValue;if("booleanValue"in v)return v.booleanValue;if("integerValue"in v)return Number(v.integerValue);if("doubleValue"in v)return v.doubleValue;if("timestampValue"in v)return new Date(v.timestampValue);if("arrayValue"in v)return (v.arrayValue.values||[]).map(dec);if("mapValue"in v)return Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,dec(x)]));return null;}
function docToObj(d:any){return d?{id:d.name.split("/").pop(),...Object.fromEntries(Object.entries(d.fields||{}).map(([k,v])=>[k,dec(v)]))}:null;}
const collections:AnyObj={user:"users",category:"categories",product:"products",productImage:"productImages",wishlistItem:"wishlistItems",review:"reviews",paymentGateway:"paymentGateways",order:"orders",paymentTransaction:"paymentTransactions",stockReservation:"stockReservations",orderItem:"orderItems",coupon:"coupons",auditLog:"auditLogs",storeSetting:"storeSettings",deliveryZone:"deliveryZones",banner:"banners",flashSale:"flashSales",staffAccount:"staffAccounts",imageBlob:"imageBlobs",returnRequest:"returnRequests"};
function cmp(a:any,b:any){if(a instanceof Date)a=a.getTime();if(b instanceof Date)b=b.getTime();return a<b?-1:a>b?1:0;}
function get(obj:any,key:string){return key.split(".").reduce((x,k)=>x?.[k],obj);}
function match(obj:any,where:any):boolean{if(!where)return true;if(where.AND&&!(Array.isArray(where.AND)?where.AND:[where.AND]).every((x:any)=>match(obj,x)))return false;if(where.OR&&!where.OR.some((x:any)=>match(obj,x)))return false;if(where.NOT&&match(obj,where.NOT))return false;for(const [k,cond] of Object.entries(where)){if(k==="AND"||k==="OR"||k==="NOT")continue;const v=get(obj,k);if(cond&&typeof cond==="object"&&!Array.isArray(cond)){if("equals"in cond&&v!==cond.equals)return false;if("in"in cond&&!((cond as any).in as any[]).includes(v))return false;if("notIn"in cond&&((cond as any).notIn as any[]).includes(v))return false;if("contains"in cond&&!String(v??"").toLowerCase().includes(String((cond as any).contains).toLowerCase()))return false;if("startsWith"in cond&&!String(v??"").toLowerCase().startsWith(String((cond as any).startsWith).toLowerCase()))return false;if("gt"in cond&&!(v>(cond as any).gt))return false;if("gte"in cond&&!(v>=(cond as any).gte))return false;if("lt"in cond&&!(v<(cond as any).lt))return false;if("lte"in cond&&!(v<=(cond as any).lte))return false;}else if(v!==cond)return false;}return true;}
function stripData(data:any){const out={...data};for(const k of Object.keys(out))if(out[k]===undefined)delete out[k];return out;}
async function all(model:string){let token="";const out:any[]=[];do{const q=token?`?pageSize=1000&pageToken=${encodeURIComponent(token)}`:"?pageSize=1000";const j=await req(`/${collections[model]}${q}`);out.push(...(j.documents||[]).map(docToObj));token=j.nextPageToken||"";}while(token);return out;}
async function rawGet(model:string,id:string){try{return docToObj(await req(`/${collections[model]}/${encodeURIComponent(id)}`));}catch(e:any){if(String(e.message).startsWith("Firestore 404"))return null;throw e;}}
async function write(model:string,id:string,data:any){const fields=Object.fromEntries(Object.entries(stripData(data)).map(([k,v])=>[k,enc(v)]));return docToObj(await req(`/${collections[model]}/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify({fields})}));}
async function remove(model:string,id:string){await req(`/${collections[model]}/${encodeURIComponent(id)}`,{method:"DELETE"});}
const DEFAULTS:AnyObj={user:{role:"CUSTOMER"},product:{stock:0,lowStockThreshold:5,featured:false,published:false,freeShipping:false},productImage:{sortOrder:0},review:{approved:false},paymentGateway:{mode:"SANDBOX",enabled:false,sortOrder:0},order:{discount:0,status:"PENDING",paymentStatus:"PENDING"},paymentTransaction:{status:"PENDING"},stockReservation:{status:"HELD"},coupon:{active:true},deliveryZone:{active:true},banner:{active:false,sortOrder:0},flashSale:{active:false},staffAccount:{active:true}};
function withDefaults(model:string,data:AnyObj){const out={...data};for(const [k,v] of Object.entries(DEFAULTS[model]||{}))if(out[k]===undefined)out[k]=v;return out;}
function id(){return crypto.randomUUID().replace(/-/g,"").slice(0,24);}
async function deterministicId(value:string){
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("").slice(0,24);
}
async function applyData(model:string,idv:string,data:any){const current=await rawGet(model,idv);const next:AnyObj={...(current||{}),...stripData(data)};for(const [k,v] of Object.entries(data)){if(v&&typeof v==="object"&&"increment"in v)next[k]=Number(current?.[k]||0)+Number((v as any).increment);if(v&&typeof v==="object"&&"decrement"in v)next[k]=Number(current?.[k]||0)-Number((v as any).decrement);}next.id=idv;return write(model,idv,next);}
const relationMap:any={user:{orders:["order","userId"],wishlist:["wishlistItem","userId"],reviews:["review","userId"]},category:{products:["product","categoryId"]},product:{category:["category","categoryId"],images:["productImage","productId"],items:["orderItem","productId"],reservations:["stockReservation","productId"],wishlist:["wishlistItem","productId"],reviews:["review","productId"]},productImage:{product:["product","productId"]},wishlistItem:{user:["user","userId"],product:["product","productId"]},review:{user:["user","userId"],product:["product","productId"]},paymentGateway:{orders:["order","paymentGatewayId"],transactions:["paymentTransaction","gatewayId"]},order:{user:["user","userId"],paymentGateway:["paymentGateway","paymentGatewayId"],items:["orderItem","orderId"],transactions:["paymentTransaction","orderId"],reservations:["stockReservation","orderId"]},paymentTransaction:{order:["order","orderId"],gateway:["paymentGateway","gatewayId"]},stockReservation:{order:["order","orderId"],product:["product","productId"]},orderItem:{order:["order","orderId"],product:["product","productId"]}};
function modelFor(obj:any){return obj?.__model||"";}
function applySelect(obj:any,sel:any){if(!sel)return obj;const o:any={};for(const k of Object.keys(sel))if(sel[k]&&k in obj)o[k]=obj[k];return o;}
function sortRows(rows:any[],order:any){if(!order)return rows;const arr=Array.isArray(order)?order:[order];return [...rows].sort((a,b)=>{for(const spec of arr){const [k,v]=Object.entries(spec)[0] as any;const c=cmp(get(a,k),get(b,k));if(c)return v==="desc"?-c:c;}return 0;});}
function withModel(row:any,m:string){return row?Object.assign(row,{__model:m}):row;}
async function include(obj:any,inc:any,select?:any){if(!obj)return obj;const out={...obj};for(const [rel,opt] of Object.entries(inc||{})){const cfg:any=opt||{};const map=relationMap[modelFor(obj)]?.[rel];if(!map)continue;const [m,f]=map as any;const one=["user","category","product","paymentGateway","order"].includes(rel);if(one){const rid=obj[f];const raw=rid?await rawGet(m,rid):null;out[rel]=raw?await include(withModel(raw,m),cfg.include,cfg.select):null;continue;}let matches=(await all(m)).filter((r:any)=>r[f]===obj.id);matches=sortRows(matches,cfg.orderBy);if(cfg.take)matches=matches.slice(0,cfg.take);out[rel]=await Promise.all(matches.map((x:any)=>include(withModel(x,m),cfg.include,cfg.select)));}return applySelect(out,select);}
async function query(model:string,args:any={}){let rows=(await all(model)).map(r=>withModel(r,model));rows=rows.filter(r=>match(r,args.where));rows=sortRows(rows,args.orderBy);if(args.skip)rows=rows.slice(args.skip);if(args.take!=null)rows=rows.slice(0,args.take);const result:any[]=[];for(const r of rows)result.push(await include(r,args.include,args.select));return result.map(r=>{if(r)delete r.__model;return r;});}
function compoundId(where:any){const vals=Object.values(where).flatMap((v:any)=>v&&typeof v==="object"&&!Array.isArray(v)?Object.values(v):[v]);return vals.map(v=>String(v)).join("__");}
async function resolve(model:string,where:any){if(where?.id)return rawGet(model,where.id);return (await query(model,{where,take:1}))[0]||null;}
function modelApi(model:string){return {findUnique:async(a:any={})=>resolve(model,a.where||{}).then((r:any)=>r?include(withModel(r,model),a.include,a.select):null),findFirst:async(a:any={})=>(await query(model,{...a,take:1}))[0]||null,findMany:async(a:any={})=>query(model,a),count:async(a:any={})=>(await query(model,{where:a.where})).length,aggregate:async(a:any={})=>{const rows=await query(model,{where:a.where});const out:any={};if(a._sum)for(const k of Object.keys(a._sum))out._sum={[k]:rows.reduce((s,r)=>s+Number(r[k]||0),0)};return out;},create:async(a:any={})=>{const i=a.data.id||id();const nested:AnyObj={};const plain:AnyObj={};for(const [k,v] of Object.entries(a.data)){const rel=relationMap[model]?.[k];if(rel&&v&&typeof v==="object"&&!Array.isArray(v)&&"create"in(v as any)&&!["user","category","product","paymentGateway","order"].includes(k))nested[k]={rel,rows:Array.isArray((v as any).create)?(v as any).create:[(v as any).create]};else plain[k]=v;}const d={...withDefaults(model,plain),id:i,createdAt:a.data.createdAt||new Date(),updatedAt:a.data.updatedAt||new Date()};const r=await write(model,i,d);for(const {rel,rows} of Object.values(nested) as any[]){const [cm,fk]=rel;for(const row of rows){const ci=row.id||id();await write(cm,ci,{...withDefaults(cm,row),id:ci,[fk]:i,createdAt:row.createdAt||new Date(),updatedAt:row.updatedAt||new Date()});}}return include(withModel(r,model),a.include,a.select);},createMany:async(a:any={})=>{for(const original of a.data||[]){const i=original.id||id();await write(model,i,{...withDefaults(model,original),id:i,createdAt:original.createdAt||new Date(),updatedAt:original.updatedAt||new Date()});}return {count:(a.data||[]).length};},update:async(a:any={})=>{const existing=await resolve(model,a.where||{});if(!existing)throw new Error("Not found");const r=await applyData(model,existing.id,{...a.data,updatedAt:new Date()});return include(withModel(r,model),a.include,a.select);},updateMany:async(a:any={})=>{const rows=await query(model,{where:a.where});for(const r of rows)await applyData(model,r.id,a.data);return {count:rows.length};},delete:async(a:any={})=>{const r=await resolve(model,a.where||{});if(!r)throw new Error("Not found");await remove(model,r.id);return r;},deleteMany:async(a:any={})=>{const rows=await query(model,{where:a.where});for(const r of rows)await remove(model,r.id);return {count:rows.length};},upsert:async(a:any={})=>{const r=await resolve(model,a.where||{});return r?modelApi(model).update({where:{id:r.id},data:a.update}):modelApi(model).create({data:{...a.create,id:compoundId(a.where||{})}});}};}
const db:any=new Proxy({} as AnyObj, {get:(target,model:string)=>model in target?target[model]:modelApi(model)});
db.$transaction=async(fn:any)=>fn(db);

/**
 * Atomically decrements inventory and creates the order, order items, and stock
 * reservations in one native Firestore read-write transaction. Keep this
 * checkout path separate from the Prisma-compatible $transaction shim below.
 */
export async function createOrderWithStockReservation(args: {
  orderData: AnyObj;
  items: Array<{ productId: string; name: string; unitPrice: number; quantity: number; lineTotal: number }>;
  expiresAt: Date;
}) {
  const orderId = args.orderData.idempotencyKey ? await deterministicId("order:" + String(args.orderData.idempotencyKey)) : id();
  const now = new Date();
  const order: AnyObj = { ...withDefaults("order", args.orderData), id: orderId, createdAt: now, updatedAt: now };
  const txResponse: any = await req(":beginTransaction", {
    method: "POST",
    body: JSON.stringify({ options: { readWrite: {} } })
  });
  const transaction = String(txResponse?.transaction || "");
  if (!transaction) throw new Error("Firestore did not create a checkout transaction");

  try {
    const productSnapshots = new Map<string, { document: any; product: AnyObj }>();
    for (const item of args.items) {
      if (productSnapshots.has(item.productId)) throw new Error("Duplicate products are not allowed");
      const document: any = await req(`/products/${encodeURIComponent(item.productId)}?transaction=${encodeURIComponent(transaction)}`);
      const product = docToObj(document) as AnyObj | null;
      if (!product || product.published !== true) throw new Error("Product is unavailable");
      const stock = Number(product.stock ?? 0);
      if (!Number.isFinite(stock) || stock < item.quantity) throw new Error("Stock changed during checkout");
      productSnapshots.set(item.productId, { document, product });
    }

    const writes: AnyObj[] = [];
    for (const item of args.items) {
      const snapshot = productSnapshots.get(item.productId)!;
      const product = snapshot.product;
      writes.push({
        update: {
          name: snapshot.document.name,
          fields: { stock: enc(Number(product.stock) - item.quantity), updatedAt: enc(now) }
        },
        updateMask: { fieldPaths: ["stock", "updatedAt"] }
      });
    }

    const orderItems = args.items.map(item => ({
      ...withDefaults("orderItem", item), id: id(), orderId, createdAt: now, updatedAt: now
    }));
    const reservations = args.items.map(item => ({
      ...withDefaults("stockReservation", { orderId, productId: item.productId, quantity: item.quantity, expiresAt: args.expiresAt, status: "HELD" }),
      id: id(), orderId, productId: item.productId, quantity: item.quantity, expiresAt: args.expiresAt,
      status: "HELD", createdAt: now, updatedAt: now
    }));

    const project = await serviceAccountValue("FIREBASE_PROJECT_ID", "project_id");
    if (!project) throw new Error("FIREBASE_PROJECT_ID is required");
    const documentName = (collection: string, documentId: string) =>
      `projects/${project}/databases/(default)/documents/${collection}/${documentId}`;
    const createDoc = (collection: string, value: AnyObj) => ({
      update: {
        name: documentName(collection, value.id),
        fields: Object.fromEntries(Object.entries(stripData(value)).map(([key, val]) => [key, enc(val)]))
      },
      currentDocument: { exists: false }
    });
    writes.push(createDoc("orders", order));
    for (const item of orderItems) writes.push(createDoc("orderItems", item));
    for (const reservation of reservations) writes.push(createDoc("stockReservations", reservation));

    await req(":commit", {
      method: "POST",
      body: JSON.stringify({ transaction, writes })
    });
    return order;
  } catch (error) {
    try {
      await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) });
    } catch {}
    throw error;
  }
}


type AtomicPaymentArgs = {
  orderId: string;
  gatewayId: string;
  providerTransactionId: string;
  reference: string | null;
  amount: number;
  rawResponse: AnyObj;
  expectedPaymentReference?: string;
  requirePaymentEvidence?: boolean;
  expectedSenderLast4?: string;
  expectedProvider?: string;
  autoConfirmed?: boolean;
  auditAction?: string;
};

async function transactionGet(collection: string, documentId: string, transaction: string) {
  try {
    return await req(`/${collection}/${encodeURIComponent(documentId)}?transaction=${encodeURIComponent(transaction)}`);
  } catch (error) {
    if (String((error as Error)?.message || error).startsWith("Firestore 404")) return null;
    throw error;
  }
}

async function transactionQuery(collection: string, filters: Array<{ field: string; value: any }>, transaction: string) {
  const fieldFilters = filters.map(filter => ({
    fieldFilter: { field: { fieldPath: filter.field }, op: "EQUAL", value: enc(filter.value) }
  }));
  const where = fieldFilters.length === 1 ? fieldFilters[0] : { compositeFilter: { op: "AND", filters: fieldFilters } };
  const response: any = await req(":runQuery", {
    method: "POST",
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], where }, transaction })
  });
  return (Array.isArray(response) ? response : []).filter((row: any) => row.document).map((row: any) => row.document);
}

function firestoreDocumentName(collection: string, documentId: string, project: string) {
  return `projects/${project}/databases/(default)/documents/${collection}/${documentId}`;
}
function firestoreCreateWrite(collection: string, value: AnyObj, project: string) {
  return {
    update: {
      name: firestoreDocumentName(collection, value.id, project),
      fields: Object.fromEntries(Object.entries(stripData(value)).map(([key, val]) => [key, enc(val)]))
    },
    currentDocument: { exists: false }
  };
}
function firestorePatchWrite(collection: string, document: any, values: AnyObj, project: string) {
  return {
    update: {
      name: document.name || firestoreDocumentName(collection, String(document.id), project),
      fields: Object.fromEntries(Object.entries(values).map(([key, val]) => [key, enc(val)]))
    },
    updateMask: { fieldPaths: Object.keys(values) }
  };
}

/**
 * Atomically changes a pending order to paid, records a unique provider
 * transaction, and confirms all held stock reservations.
 */
export async function confirmPaymentAtomically(args: AtomicPaymentArgs) {
  const transactionId = await deterministicId("payment:" + args.gatewayId + ":" + args.providerTransactionId);
  const now = new Date();
  const started: any = await req(":beginTransaction", { method: "POST", body: JSON.stringify({ options: { readWrite: {} } }) });
  const transaction = String(started?.transaction || "");
  if (!transaction) throw new Error("Firestore did not create a payment transaction");
  try {
    const orderDocument: any = await transactionGet("orders", args.orderId, transaction);
    const order = docToObj(orderDocument) as AnyObj | null;
    if (!order) { await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {}); return { confirmed: false, reason: "not_found" as const }; }
    if (order.paymentStatus !== "PENDING" || order.status !== "PENDING") {
      await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
      return { confirmed: false, reason: order.paymentStatus === "PAID" ? "duplicate" as const : "state_changed" as const };
    }
    if ((args.expectedPaymentReference !== undefined && order.paymentReference !== args.expectedPaymentReference) ||
        (args.expectedSenderLast4 !== undefined && order.paymentSenderLast4 !== args.expectedSenderLast4) ||
        (args.expectedProvider !== undefined && order.paymentProvider !== args.expectedProvider) ||
        (args.requirePaymentEvidence && !order.paymentProofSubmittedAt && !order.paymentProvider)) {
      await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
      return { confirmed: false, reason: "evidence_mismatch" as const };
    }
    if (String(order.paymentGatewayId || "") !== args.gatewayId || Math.abs(Number(order.total) - args.amount) > 0.01) {
      await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
      return { confirmed: false, reason: "amount_or_gateway_mismatch" as const };
    }
    const existingPayment: any = await transactionGet("paymentTransactions", transactionId, transaction);
    const existingProviderRows = await transactionQuery("paymentTransactions", [
      { field: "gatewayId", value: args.gatewayId },
      { field: "providerTransactionId", value: args.providerTransactionId }
    ], transaction);
    if (existingPayment || existingProviderRows.length) {
      await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
      return { confirmed: false, reason: "duplicate_transaction" as const };
    }
    const reservationDocs = await transactionQuery("stockReservations", [
      { field: "orderId", value: args.orderId }, { field: "status", value: "HELD" }
    ], transaction);
    const project = await serviceAccountValue("FIREBASE_PROJECT_ID", "project_id");
    if (!project) throw new Error("FIREBASE_PROJECT_ID is required");
    const writes: AnyObj[] = [
      firestorePatchWrite("orders", orderDocument, {
        paymentStatus: "PAID", status: "CONFIRMED", paymentReference: args.reference,
        ...(args.autoConfirmed ? { paymentAutoConfirmedAt: now } : {}),
        updatedAt: now
      }, project),
      firestoreCreateWrite("paymentTransactions", {
        id: transactionId, orderId: args.orderId, gatewayId: args.gatewayId,
        reference: args.reference, providerTransactionId: args.providerTransactionId,
        amount: args.amount, status: "PAID", rawResponse: args.rawResponse,
        verifiedAt: now, createdAt: now, updatedAt: now
      }, project)
    ];
    for (const reservationDocument of reservationDocs) {
      writes.push(firestorePatchWrite("stockReservations", reservationDocument, { status: "CONFIRMED", updatedAt: now }, project));
    }
    if (args.auditAction) {
      writes.push(firestoreCreateWrite("auditLogs", {
        id: id(), action: args.auditAction, entity: "Order", entityId: args.orderId,
        metadata: { providerTransactionId: args.providerTransactionId }, createdAt: now, updatedAt: now
      }, project));
    }
    await req(":commit", { method: "POST", body: JSON.stringify({ transaction, writes }) });
    return { confirmed: true, reason: "confirmed" as const };
  } catch (error) {
    await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
    throw error;
  }
}





/**
 * Atomically validates and applies an admin order status/tracking update with
 * its audit records, preventing stale concurrent updates from overwriting state.
 */
export async function updateOrderAdminFieldsAtomically(args: {
  orderId: string; actorId?: string | null; status?: string;
  courierName?: string | null; trackingNumber?: string | null;
}) {
  const transitions: Record<string, string[]> = {
    PENDING: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["PROCESSING", "CANCELLED"],
    PROCESSING: ["SHIPPED"], SHIPPED: ["DELIVERED"],
    DELIVERED: [], CANCELLED: [], REFUNDED: []
  };
  const now = new Date();
  const started: any = await req(":beginTransaction", { method: "POST", body: JSON.stringify({ options: { readWrite: {} } }) });
  const transaction = String(started?.transaction || "");
  if (!transaction) throw new Error("Firestore did not create an order-update transaction");
  try {
    const orderDocument: any = await transactionGet("orders", args.orderId, transaction);
    const order = docToObj(orderDocument) as AnyObj | null;
    if (!order) {
      await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
      return { updated: false, reason: "not_found" as const };
    }
    if (args.status && args.status !== order.status && !transitions[String(order.status)]?.includes(args.status)) {
      await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
      return { updated: false, reason: "invalid_transition" as const };
    }
    if (args.status === "CONFIRMED" && order.paymentStatus !== "PAID") {
      await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
      return { updated: false, reason: "payment_not_paid" as const };
    }
    const resultingStatus = args.status || String(order.status);
    if ((args.courierName !== undefined || args.trackingNumber !== undefined) &&
        !["PROCESSING", "SHIPPED", "DELIVERED"].includes(resultingStatus)) {
      await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
      return { updated: false, reason: "tracking_not_allowed" as const };
    }
    const patch: AnyObj = { updatedAt: now };
    if (args.status && args.status !== order.status) {
      patch.status = args.status;
      if (args.status === "SHIPPED") patch.shippedAt = now;
      if (args.status === "DELIVERED") patch.deliveredAt = now;
    }
    if (args.courierName !== undefined) patch.courierName = args.courierName;
    if (args.trackingNumber !== undefined) patch.trackingNumber = args.trackingNumber;
    const project = await serviceAccountValue("FIREBASE_PROJECT_ID", "project_id");
    if (!project) throw new Error("FIREBASE_PROJECT_ID is required");
    const writes: AnyObj[] = [firestorePatchWrite("orders", orderDocument, patch, project)];
    if (args.status && args.status !== order.status) {
      writes.push(firestoreCreateWrite("auditLogs", {
        id: id(), actorId: args.actorId || null, action: "ORDER_STATUS_CHANGED",
        entity: "Order", entityId: args.orderId,
        metadata: { from: order.status, to: args.status }, createdAt: now, updatedAt: now
      }, project));
    }
    if (args.courierName !== undefined || args.trackingNumber !== undefined) {
      writes.push(firestoreCreateWrite("auditLogs", {
        id: id(), actorId: args.actorId || null, action: "SHIPMENT_TRACKING_UPDATED",
        entity: "Order", entityId: args.orderId,
        metadata: {
          courierName: args.courierName !== undefined ? args.courierName : order.courierName,
          trackingNumber: args.trackingNumber !== undefined ? args.trackingNumber : order.trackingNumber
        }, createdAt: now, updatedAt: now
      }, project));
    }
    await req(":commit", { method: "POST", body: JSON.stringify({ transaction, writes }) });
    return { updated: true, status: resultingStatus };
  } catch (error) {
    await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
    throw error;
  }
}

/**
 * Atomically records a manual refund after verifying the order is still paid.
 * This records the refund; it does not call a payment provider's refund API.
 */
export async function recordRefundAtomically(args: {
  orderId: string; gatewayId: string; reference: string; reason?: string | null;
}) {
  const now = new Date();
  const transactionId = await deterministicId("refund:" + args.gatewayId + ":" + args.reference);
  const started: any = await req(":beginTransaction", { method: "POST", body: JSON.stringify({ options: { readWrite: {} } }) });
  const transaction = String(started?.transaction || "");
  if (!transaction) throw new Error("Firestore did not create a refund transaction");
  try {
    const orderDocument: any = await transactionGet("orders", args.orderId, transaction);
    const order = docToObj(orderDocument) as AnyObj | null;
    if (!order || order.paymentStatus !== "PAID" || !args.gatewayId ||
        String(order.paymentGatewayId || "") !== args.gatewayId) {
      await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
      return { refunded: false, reason: "state_changed" as const };
    }
    const existing = await transactionGet("paymentTransactions", transactionId, transaction);
    const existingProviderRows = await transactionQuery("paymentTransactions", [
      { field: "gatewayId", value: args.gatewayId }, { field: "providerTransactionId", value: args.reference }
    ], transaction);
    if (existing || existingProviderRows.length) {
      await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
      return { refunded: false, reason: "duplicate_reference" as const };
    }
    const project = await serviceAccountValue("FIREBASE_PROJECT_ID", "project_id");
    if (!project) throw new Error("FIREBASE_PROJECT_ID is required");
    const writes = [
      firestorePatchWrite("orders", orderDocument, {
        paymentStatus: "REFUNDED", status: "REFUNDED", refundReference: args.reference,
        refundReason: args.reason || null, refundedAt: now, updatedAt: now
      }, project),
      firestoreCreateWrite("paymentTransactions", {
        id: transactionId, orderId: args.orderId, gatewayId: args.gatewayId,
        reference: args.reference, providerTransactionId: args.reference,
        amount: Number(order.total), status: "REFUNDED",
        rawResponse: { source: "admin_manual_refund", reason: args.reason || null },
        verifiedAt: now, createdAt: now, updatedAt: now
      }, project),
      firestoreCreateWrite("auditLogs", {
        id: id(), action: "ORDER_REFUNDED", entity: "Order", entityId: args.orderId,
        metadata: { reference: args.reference, reason: args.reason || null },
        createdAt: now, updatedAt: now
      }, project)
    ];
    await req(":commit", { method: "POST", body: JSON.stringify({ transaction, writes }) });
    return { refunded: true, reason: "refunded" as const };
  } catch (error) {
    await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
    throw error;
  }
}

/**
 * Claims a mobile-money transaction reference and attaches proof to an order
 * atomically, preventing two concurrent submissions from linking the same ID
 * to different orders.
 */
export async function claimPaymentProofAtomically(args: {
  orderId: string; gatewayId: string; provider: string; transactionId: string;
  senderLast4: string;
}) {
  const now = new Date();
  const claimId = await deterministicId("payment-proof:" + args.provider + ":" + args.transactionId);
  const started: any = await req(":beginTransaction", { method: "POST", body: JSON.stringify({ options: { readWrite: {} } }) });
  const transaction = String(started?.transaction || "");
  if (!transaction) throw new Error("Firestore did not create a payment-proof transaction");
  try {
    const orderDocument: any = await transactionGet("orders", args.orderId, transaction);
    const order = docToObj(orderDocument) as AnyObj | null;
    const claimDocument: any = await transactionGet("paymentReferenceClaims", claimId, transaction);
    if (claimDocument) {
      const claim = docToObj(claimDocument) as AnyObj;
      await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
      return { accepted: false, reason: claim.orderId === args.orderId ? "duplicate" as const : "reference_used" as const };
    }
    if (!order || order.status !== "PENDING" || order.paymentStatus !== "PENDING") {
      await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
      return { accepted: false, reason: "order_state" as const };
    }
    if (String(order.paymentGatewayId || "") !== args.gatewayId ||
        String(order.paymentProvider || args.provider) !== args.provider ||
        (order.paymentReference && order.paymentReference !== args.transactionId)) {
      await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
      return { accepted: false, reason: "order_evidence" as const };
    }
    const project = await serviceAccountValue("FIREBASE_PROJECT_ID", "project_id");
    if (!project) throw new Error("FIREBASE_PROJECT_ID is required");
    const writes = [
      firestorePatchWrite("orders", orderDocument, {
        paymentReference: args.transactionId, paymentSenderLast4: args.senderLast4,
        paymentProvider: args.provider, paymentProofSubmittedAt: now, updatedAt: now
      }, project),
      firestoreCreateWrite("paymentReferenceClaims", {
        id: claimId, orderId: args.orderId, gatewayId: args.gatewayId,
        provider: args.provider, transactionId: args.transactionId,
        createdAt: now, updatedAt: now
      }, project)
    ];
    await req(":commit", { method: "POST", body: JSON.stringify({ transaction, writes }) });
    return { accepted: true, reason: "claimed" as const };
  } catch (error) {
    await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
    throw error;
  }
}

/**
 * Atomically rejects a pending payment, releases held reservations, and restores
 * product stock once. The order-state check and all stock writes share one commit.
 */
export async function rejectPendingOrderAtomically(orderId: string, auditAction = "ADMIN_PAYMENT_REJECTED") {
  const now = new Date();
  const started: any = await req(":beginTransaction", { method: "POST", body: JSON.stringify({ options: { readWrite: {} } }) });
  const transaction = String(started?.transaction || "");
  if (!transaction) throw new Error("Firestore did not create a payment rejection transaction");
  try {
    const orderDocument: any = await transactionGet("orders", orderId, transaction);
    const order = docToObj(orderDocument) as AnyObj | null;
    if (!order || order.paymentStatus !== "PENDING" || order.status !== "PENDING") {
      await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
      return { rejected: false };
    }
    const reservationDocs = await transactionQuery("stockReservations", [
      { field: "orderId", value: orderId }, { field: "status", value: "HELD" }
    ], transaction);
    const products = new Map<string, { document: any; product: AnyObj }>();
    for (const reservationDocument of reservationDocs) {
      const reservation = docToObj(reservationDocument) as AnyObj;
      const productId = String(reservation.productId);
      if (products.has(productId)) continue;
      const productDocument: any = await transactionGet("products", productId, transaction);
      const product = docToObj(productDocument) as AnyObj | null;
      if (!product) throw new Error("Reserved product is missing; rejection needs manual review");
      products.set(productId, { document: productDocument, product });
    }
    const project = await serviceAccountValue("FIREBASE_PROJECT_ID", "project_id");
    if (!project) throw new Error("FIREBASE_PROJECT_ID is required");
    const writes: AnyObj[] = [
      firestorePatchWrite("orders", orderDocument, { paymentStatus: "FAILED", status: "CANCELLED", updatedAt: now }, project)
    ];
    for (const reservationDocument of reservationDocs) {
      writes.push(firestorePatchWrite("stockReservations", reservationDocument, { status: "RELEASED", updatedAt: now }, project));
    }
    const increments = new Map<string, number>();
    for (const reservationDocument of reservationDocs) {
      const reservation = docToObj(reservationDocument) as AnyObj;
      const productId = String(reservation.productId);
      increments.set(productId, (increments.get(productId) || 0) + Number(reservation.quantity || 0));
    }
    for (const [productId, quantity] of increments) {
      const snapshot = products.get(productId)!;
      writes.push(firestorePatchWrite("products", snapshot.document, {
        stock: Number(snapshot.product.stock || 0) + quantity, updatedAt: now
      }, project));
    }
    writes.push(firestoreCreateWrite("auditLogs", {
      id: id(), action: auditAction, entity: "Order", entityId: orderId,
      metadata: { source: "atomic_payment_rejection" }, createdAt: now, updatedAt: now
    }, project));
    await req(":commit", { method: "POST", body: JSON.stringify({ transaction, writes }) });
    return { rejected: true };
  } catch (error) {
    await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
    throw error;
  }
}

/**
 * Atomically releases held reservations for an expired pending order and restores
 * each product's stock exactly once.
 */
export async function releaseOrderStockAtomically(orderId: string, now = new Date()) {
  const started: any = await req(":beginTransaction", { method: "POST", body: JSON.stringify({ options: { readWrite: {} } }) });
  const transaction = String(started?.transaction || "");
  if (!transaction) throw new Error("Firestore did not create a stock-release transaction");
  try {
    const orderDocument: any = await transactionGet("orders", orderId, transaction);
    const order = docToObj(orderDocument) as AnyObj | null;
    if (!order || order.status !== "PENDING" || order.paymentStatus !== "PENDING") {
      await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
      return { released: 0, cancelled: false };
    }
    const reservations = await transactionQuery("stockReservations", [
      { field: "orderId", value: orderId }, { field: "status", value: "HELD" }
    ], transaction);
    const expired = reservations.filter((doc: any) => {
      const row = docToObj(doc) as AnyObj;
      return row.expiresAt && new Date(row.expiresAt).getTime() < now.getTime();
    });
    if (!expired.length) {
      await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
      return { released: 0, cancelled: false };
    }
    const products = new Map<string, { document: any; product: AnyObj }>();
    for (const reservationDocument of expired) {
      const reservation = docToObj(reservationDocument) as AnyObj;
      if (products.has(String(reservation.productId))) continue;
      const productDocument: any = await transactionGet("products", String(reservation.productId), transaction);
      const product = docToObj(productDocument) as AnyObj | null;
      if (!product) throw new Error("Reserved product is missing; stock release needs manual review");
      products.set(String(reservation.productId), { document: productDocument, product });
    }
    const project = await serviceAccountValue("FIREBASE_PROJECT_ID", "project_id");
    if (!project) throw new Error("FIREBASE_PROJECT_ID is required");
    const writes: AnyObj[] = [];
    for (const reservationDocument of expired) {
      writes.push(firestorePatchWrite("stockReservations", reservationDocument, { status: "RELEASED", updatedAt: now }, project));
    }
    const increments = new Map<string, number>();
    for (const reservationDocument of expired) {
      const reservation = docToObj(reservationDocument) as AnyObj;
      increments.set(String(reservation.productId), (increments.get(String(reservation.productId)) || 0) + Number(reservation.quantity || 0));
    }
    for (const [productId, quantity] of increments) {
      const snapshot = products.get(productId)!;
      writes.push(firestorePatchWrite("products", snapshot.document, {
        stock: Number(snapshot.product.stock || 0) + quantity, updatedAt: now
      }, project));
    }
    const allReservationsExpired = expired.length === reservations.length;
    if (allReservationsExpired) {
      writes.push(firestorePatchWrite("orders", orderDocument, { status: "CANCELLED", updatedAt: now }, project));
    }
    await req(":commit", { method: "POST", body: JSON.stringify({ transaction, writes }) });
    return { released: expired.length, cancelled: allReservationsExpired };
  } catch (error) {
    await req(":rollback", { method: "POST", body: JSON.stringify({ transaction }) }).catch(() => {});
    throw error;
  }
}

export {db};