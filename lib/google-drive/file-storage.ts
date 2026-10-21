type DriveTokenResponse = { access_token?: string; error?: string; error_description?: string };
type DriveUploadResponse = { id?: string; name?: string; error?: { message?: string } };

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function textBase64Url(value: string) {
  return base64Url(new TextEncoder().encode(value));
}
function driveConfig() {
  const email = process.env.GOOGLE_DRIVE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  const configured = [email, privateKey, folderId].filter(Boolean).length;
  if (configured === 0) return null;
  if (!email || !privateKey || !folderId) {
    throw new Error("Google Drive mirror is partially configured. Set GOOGLE_DRIVE_CLIENT_EMAIL, GOOGLE_DRIVE_PRIVATE_KEY and GOOGLE_DRIVE_FOLDER_ID.");
  }
  return { email, privateKey, folderId };
}
async function createAccessToken(email: string, privateKey: string) {
  const pem = privateKey.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s/g, "");
  const binary = atob(pem);
  const der = Uint8Array.from(binary, c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const header = textBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = textBase64Url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsigned = header + "." + claim;
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const assertion = unsigned + "." + base64Url(signature);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store"
  });
  const data = await response.json().catch(() => null) as DriveTokenResponse | null;
  if (!response.ok || !data?.access_token) {
    throw new Error("Google Drive authentication failed: " + String(data?.error_description || data?.error || response.status).slice(0, 180));
  }
  return data.access_token;
}

/** Mirror public catalogue/review images to a private Google Drive folder. Telegram remains the primary serving store. */
export async function mirrorImageToGoogleDrive(bytes: Uint8Array, filename: string, mime: string) {
  const config = driveConfig();
  if (!config) return { configured: false as const, fileId: null };
  if (!bytes.length) throw new Error("Cannot mirror an empty image to Google Drive.");
  const token = await createAccessToken(config.email, config.privateKey);
  const metadata = { name: filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180), mimeType: mime, parents: [config.folderId] };
  const form = new FormData();
  form.set("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.set("file", new Blob([Uint8Array.from(bytes).buffer as ArrayBuffer], { type: mime }), metadata.name);
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name", {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
    body: form,
    cache: "no-store"
  });
  const data = await response.json().catch(() => null) as DriveUploadResponse | null;
  if (!response.ok || !data?.id) {
    throw new Error("Google Drive image mirror failed (" + response.status + "): " + String(data?.error?.message || "invalid response").slice(0, 180));
  }
  return { configured: true as const, fileId: data.id };
}
