import { getCloudflareContext } from "@opennextjs/cloudflare";

function clean(value: unknown) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  return (s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")) ? s.slice(1, -1).trim() : s;
}
async function env(name: string) {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const value = clean((ctx.env as Record<string, unknown>)[name]);
    if (value) return value;
  } catch {}
  try { return clean(process.env[name]); } catch { return ""; }
}
async function accountValue(name: string, field: string) {
  const value = await env(name);
  if (value.startsWith("{")) {
    try { return String(JSON.parse(value)[field] || "").trim(); } catch {}
  }
  return value;
}
function b64url(value: ArrayBuffer | string) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function privateKeyBytes(pem: string) {
  const body = pem.replace(/\\n/g, "\n").replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(body);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
let cached: { token: string; expires: number } | null = null;
async function storageToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expires > now + 60) return cached.token;
  const email = await accountValue("FIREBASE_CLIENT_EMAIL", "client_email");
  const pem = (await accountValue("FIREBASE_PRIVATE_KEY", "private_key")).replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\r/g, "").trim();
  if (!email || !pem) throw new Error("Firebase service-account credentials are missing.");
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss: email, scope: "https://www.googleapis.com/auth/devstorage.read_write",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600
  }));
  const key = await crypto.subtle.importKey("pkcs8", privateKeyBytes(pem), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(head + "." + payload));
  const assertion = head + "." + payload + "." + b64url(signature);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=" + encodeURIComponent(assertion)
  });
  if (!response.ok) throw new Error("Firebase Storage authentication failed (" + response.status + ").");
  const result = await response.json() as { access_token?: string; expires_in?: number };
  if (!result.access_token) throw new Error("Firebase Storage did not return an access token.");
  cached = { token: result.access_token, expires: now + Number(result.expires_in || 3600) };
  return cached.token;
}
async function bucketName() {
  const configured = await env("FIREBASE_STORAGE_BUCKET");
  if (configured) return configured.replace(/^gs:\/\//, "").replace(/\/$/, "");
  const project = await accountValue("FIREBASE_PROJECT_ID", "project_id");
  if (!project) throw new Error("FIREBASE_STORAGE_BUCKET is required (or configure FIREBASE_PROJECT_ID).");
  return project + ".firebasestorage.app";
}
export async function uploadPrivatePaymentProof(orderId: string, bytes: Uint8Array) {
  const bucket = await bucketName();
  const path = "payment-proofs/" + encodeURIComponent(orderId) + "/" + crypto.randomUUID() + ".jpg";
  const response = await fetch("https://storage.googleapis.com/upload/storage/v1/b/" + encodeURIComponent(bucket) + "/o?uploadType=media&name=" + encodeURIComponent(path), {
    method: "POST",
    headers: { authorization: "Bearer " + await storageToken(), "content-type": "image/jpeg" },
    body: bytes
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error("Payment proof storage upload failed (" + response.status + "): " + detail.slice(0, 200));
  }
  return path;
}
export async function deletePrivateStorageObject(path: string) {
  const bucket = await bucketName();
  const response = await fetch("https://storage.googleapis.com/storage/v1/b/" + encodeURIComponent(bucket) + "/o/" + encodeURIComponent(path), {
    method: "DELETE", headers: { authorization: "Bearer " + await storageToken() }
  });
  if (!response.ok && response.status !== 404) throw new Error("Unable to remove unused payment proof (" + response.status + ").");
}
export async function readPrivatePaymentProof(path: string) {
  if (!path.startsWith("payment-proofs/") || path.includes("..")) throw new Error("Invalid payment proof storage path.");
  const bucket = await bucketName();
  const response = await fetch("https://storage.googleapis.com/storage/v1/b/" + encodeURIComponent(bucket) + "/o/" + encodeURIComponent(path) + "?alt=media", {
    headers: { authorization: "Bearer " + await storageToken() }
  });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error("Unable to retrieve payment proof (" + response.status + ").");
  }
  return new Uint8Array(await response.arrayBuffer());
}
