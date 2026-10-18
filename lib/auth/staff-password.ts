const encoder = new TextEncoder();

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export async function hashStaffPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" }, key, 256);
  return `pbkdf2-sha256$210000$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}

export async function verifyStaffPassword(password: string, encoded: string): Promise<boolean> {
  try {
    const [scheme, rounds, saltText, expected] = encoded.split("$");
    if (scheme !== "pbkdf2-sha256" || !saltText || !expected) return false;
    const saltBin = atob(saltText);
    const salt = Uint8Array.from(saltBin, ch => ch.charCodeAt(0));
    const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: Math.min(500000, Math.max(100000, Number(rounds) || 210000)), hash: "SHA-256" }, key, 256);
    const actual = b64(new Uint8Array(bits));
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}
