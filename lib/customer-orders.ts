import { getCloudflareContext } from "@opennextjs/cloudflare";

type Row = Record<string, any>;
let cachedToken: { token: string; exp: number } | null = null;

function envClean(value: unknown) {
  let s = String(value ?? "").trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1).trim();
  return s;
}
async function env(name: string) {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const value = envClean((ctx.env as Record<string, unknown>)[name]);
    if (value) return value;
  } catch {}
  return envClean(process.env[name]);
}
async function serviceValue(name: string, field: string) {
  const value = await env(name);
  if (value.startsWith("{")) {
    try { return String(JSON.parse(value)[field] || "").trim(); } catch {}
  }
  return value;
}
function b64url(input: ArrayBuffer | string) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function pemBytes(pem: string) {
  const normalized = pem.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
  const bin = atob(normalized.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, ""));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.token;
  const email = await serviceValue("FIREBASE_CLIENT_EMAIL", "client_email");
  const key = (await serviceValue("FIREBASE_PRIVATE_KEY", "private_key")).replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\r/g, "").trim();
  if (!email || !key) throw new Error("Firebase service account is not configured");
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iss: email, scope: "https://www.googleapis.com/auth/datastore", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const cryptoKey = await crypto.subtle.importKey("pkcs8", pemBytes(key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(header + "." + payload));
  const assertion = header + "." + payload + "." + b64url(signature);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=" + encodeURIComponent(assertion),
    signal: AbortSignal.timeout(7000)
  });
  if (!response.ok) throw new Error("Firebase authentication failed (" + response.status + ")");
  const data: any = await response.json();
  if (!data.access_token) throw new Error("Firebase authentication returned no access token");
  cachedToken = { token: data.access_token, exp: now + Number(data.expires_in || 3600) };
  return cachedToken.token;
}
function decodeValue(v: any): any {
  if (!v) return null;
  if ("nullValue" in v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("timestampValue" in v) return new Date(v.timestampValue);
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, decodeValue(x)]));
  return null;
}
function decodeDocument(doc: any): Row {
  return { id: String(doc.name || "").split("/").pop(), ...Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, decodeValue(v)])) };
}
async function firestore(path: string, body?: any) {
  const token = await accessToken();
  const project = await serviceValue("FIREBASE_PROJECT_ID", "project_id");
  if (!project) throw new Error("FIREBASE_PROJECT_ID is not configured");
  const response = await fetch("https://firestore.googleapis.com/v1/projects/" + project + "/databases/(default)/documents" + path, {
    method: body ? "POST" : "GET",
    headers: { authorization: "Bearer " + token, "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(9000)
  });
  if (!response.ok) throw new Error("Orders database request failed (" + response.status + ")");
  return response.status === 204 ? null : response.json();
}
async function query(collection: string, filters: any[], limit = 1000) {
  const where = filters.length === 1 ? { fieldFilter: filters[0] } : { compositeFilter: { op: "AND", filters: filters.map(fieldFilter => ({ fieldFilter })) } };
  const response: any = await firestore(":runQuery", { structuredQuery: { from: [{ collectionId: collection }], where, limit } });
  return (Array.isArray(response) ? response : []).flatMap(row => row.document ? [decodeDocument(row.document)] : []);
}

/** Efficient customer order lookup: filter in Firestore, then fetch only related items. */
export async function getCustomerOrders(userId: string) {
  const orders = await query("orders", [{ field: { fieldPath: "userId" }, op: "EQUAL", value: { stringValue: userId } }]);
  orders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const latest = orders.slice(0, 50);
  if (!latest.length) return [];
  const items: Row[] = [];
  const orderIds = latest.map(order => String(order.id));
  for (let i = 0; i < orderIds.length; i += 30) {
    const ids = orderIds.slice(i, i + 30);
    items.push(...await query("orderItems", [{ field: { fieldPath: "orderId" }, op: "IN", value: { arrayValue: { values: ids.map(id => ({ stringValue: id })) } } }]));
  }
  const byOrder = new Map<string, Row[]>();
  for (const item of items) {
    const key = String(item.orderId || "");
    if (!byOrder.has(key)) byOrder.set(key, []);
    byOrder.get(key)!.push({ ...item, unitPrice: Number(item.unitPrice || 0), lineTotal: Number(item.lineTotal || 0) });
  }
  const gatewayIds = [...new Set(latest.map(order => String(order.paymentGatewayId || "")).filter(Boolean))];
  const gateways = await Promise.all(gatewayIds.map(async id => {
    try {
      const doc: any = await firestore("/paymentGateways/" + encodeURIComponent(id));
      return [id, decodeDocument(doc)] as const;
    } catch { return [id, null] as const; }
  }));
  const gatewayById = new Map(gateways);
  return latest.map(order => ({
    ...order,
    subtotal: Number(order.subtotal || 0),
    shippingFee: Number(order.shippingFee || 0),
    discount: Number(order.discount || 0),
    total: Number(order.total || 0),
    items: byOrder.get(String(order.id)) || [],
    paymentGateway: gatewayById.get(String(order.paymentGatewayId || "")) ? {
      name: gatewayById.get(String(order.paymentGatewayId))!.name,
      type: gatewayById.get(String(order.paymentGatewayId))!.type
    } : null
  }));
}
