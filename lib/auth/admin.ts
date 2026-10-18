// Uses the Web Crypto API (globalThis.crypto.subtle) instead of Node's
// "node:crypto" module, so this works both in the Node.js runtime and in
// the Edge Runtime that Next.js middleware always runs under.

export function adminCredentials() {
  return { email: (process.env.ADMIN_EMAIL || "").trim().toLowerCase(), password: (process.env.ADMIN_PASSWORD || "").trim() };
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

export type AdminSession = { email: string; exp: number; role: string; staffId?: string };

export async function createAdminToken(email: string, role = "SUPER_ADMIN", staffId?: string): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is required");
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ email, role, staffId, exp: Date.now() + 1000 * 60 * (role === "SUPER_ADMIN" ? 720 : 60) }))
  );
  const sig = await hmacSign(secret, payload);
  return payload + "." + sig;
}

export async function readAdminSession(token: string): Promise<AdminSession | null> {
  try {
    const [payload, sig] = token.split(".");
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret || !payload || !sig) return null;
    const expected = await hmacSign(secret, payload);
    if (expected !== sig) return null;
    const data = JSON.parse(base64UrlDecodeToString(payload)) as Partial<AdminSession>;
    if (!data.email || !data.exp || data.exp <= Date.now()) return null;
    return { email: data.email, exp: data.exp, role: data.role || "SUPER_ADMIN", staffId: data.staffId };
  } catch {
    return null;
  }
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  return !!(await readAdminSession(token));
}
