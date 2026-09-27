// Uses the Web Crypto API (globalThis.crypto.subtle) instead of Node's
// "node:crypto" module, so this works both in the Node.js runtime and in
// the Edge Runtime that Next.js middleware always runs under.

export function adminCredentials() {
  return { email: process.env.ADMIN_EMAIL || "", password: process.env.ADMIN_PASSWORD || "" };
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecodeToString(str: string): string {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return atob(base64);
}

async function hmacSign(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return base64UrlEncode(new Uint8Array(sigBuffer));
}

export async function createAdminToken(email: string): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is required");
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ email, exp: Date.now() + 1000 * 60 * 60 * 12 }))
  );
  const sig = await hmacSign(secret, payload);
  return payload + "." + sig;
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const [payload, sig] = token.split(".");
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret || !payload || !sig) return false;
    const expected = await hmacSign(secret, payload);
    if (expected !== sig) return false;
    const data = JSON.parse(base64UrlDecodeToString(payload)) as { email: string; exp: number };
    return !!data.email && data.exp > Date.now();
  } catch {
    return false;
  }
}
