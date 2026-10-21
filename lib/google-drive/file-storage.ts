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
type DriveConfig =
  | { mode: "oauth"; clientId: string; clientSecret: string; refreshToken: string; folderId: string }
  | { mode: "service-account"; email: string; privateKey: string; folderId: string };

function driveConfig(): DriveConfig | null {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim();
  const oauthValues = [clientId, clientSecret, refreshToken].filter(Boolean).length;
  const email = process.env.GOOGLE_DRIVE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const serviceAccountValues = [email, privateKey].filter(Boolean).length;

  // OAuth is preferred for a user's personal My Drive, which has an actual storage quota.
  if (oauthValues > 0) {
    if (!clientId || !clientSecret || !refreshToken || !folderId) {
      throw new Error("Google Drive OAuth is partially configured. Set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN and GOOGLE_DRIVE_FOLDER_ID.");
    }
    return { mode: "oauth", clientId, clientSecret, refreshToken, folderId };
  }
  if (serviceAccountValues > 0 || folderId) {
    if (!email || !privateKey || !folderId) {
      throw new Error("Google Drive service-account config is incomplete. For personal My Drive, use GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN and GOOGLE_DRIVE_FOLDER_ID instead.");
    }
    return { mode: "service-account", email, privateKey, folderId };
  }
  return null;
}

async function exchangeToken(body: URLSearchParams) {
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

async function createAccessToken(config: DriveConfig) {
  if (config.mode === "oauth") {
    return exchangeToken(new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token"
    }));
  }

  const pem = config.privateKey.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s/g, "");
  const binary = atob(pem);
  const der = Uint8Array.from(binary, c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const header = textBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = textBase64Url(JSON.stringify({
    iss: config.email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsigned = header + "." + claim;
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const assertion = unsigned + "." + base64Url(signature);
  return exchangeToken(new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion
  }));
}

/** Mirror public catalogue/review images to a private Google Drive folder. Telegram remains the primary serving store. */
export async function mirrorImageToGoogleDrive(bytes: Uint8Array, filename: string, mime: string) {
  const config = driveConfig();
  if (!config) return { configured: false as const, fileId: null };
  if (!bytes.length) throw new Error("Cannot mirror an empty image to Google Drive.");
  const token = await createAccessToken(config);
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

/** Retry transient Drive failures with bounded exponential backoff. Never log credentials or file bytes. */
export async function mirrorImageToGoogleDriveWithRetry(bytes: Uint8Array, filename: string, mime: string, attempts = 3) {
  let lastError: unknown;
  const maxAttempts = Math.max(1, Math.min(3, attempts));
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await mirrorImageToGoogleDrive(bytes, filename, mime);
    } catch (error) {
      lastError = error;
      console.error("Google Drive backup attempt " + (attempt + 1) + " failed:", error instanceof Error ? error.message : String(error));
      if (attempt + 1 < maxAttempts) await new Promise(resolve => setTimeout(resolve, 250 * (2 ** attempt)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Google Drive backup failed after retries.");
}
