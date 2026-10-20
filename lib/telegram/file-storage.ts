type TelegramResponse = { ok?: boolean; description?: string; result?: any };

function botToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  return token;
}
function storageChat() {
  const chat = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!chat) throw new Error("TELEGRAM_CHAT_ID is not configured for file storage.");
  return chat;
}

/** Store a file in the configured private admin chat; Telegram returns a durable file_id. */
export async function storeTelegramFile(bytes: Uint8Array, filename: string, mime: string, caption = "") {
  if (!bytes.byteLength) throw new Error("Cannot store an empty file.");
  const form = new FormData();
  form.set("chat_id", storageChat());
  if (caption) form.set("caption", caption.slice(0, 900));
  form.set("document", new Blob([Uint8Array.from(bytes).buffer as ArrayBuffer], { type: mime }), filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120));
  const response = await fetch("https://api.telegram.org/bot" + botToken() + "/sendDocument", {
    method: "POST", body: form, cache: "no-store"
  });
  const data = await response.json().catch(() => null) as TelegramResponse | null;
  const fileId = data?.result?.document?.file_id;
  if (!response.ok || !data?.ok || typeof fileId !== "string" || !fileId) {
    throw new Error("Telegram file storage failed (" + response.status + "): " + String(data?.description || "invalid response").slice(0, 160));
  }
  return { fileId, messageId: Number(data?.result?.message_id) || null };
}

/** Resolve a private Telegram file_id and stream its bytes without exposing the bot token. */
export async function readTelegramFile(fileId: string): Promise<{ bytes: Uint8Array; filePath: string } | null> {
  if (!fileId || fileId.length > 512 || !/^[A-Za-z0-9_-]+$/.test(fileId)) return null;
  const token = botToken();
  const response = await fetch("https://api.telegram.org/bot" + token + "/getFile?file_id=" + encodeURIComponent(fileId), { cache: "no-store" });
  const data = await response.json().catch(() => null) as TelegramResponse | null;
  const filePath = data?.result?.file_path;
  if (response.status === 400 || data?.ok === false) return null;
  if (!response.ok || !data?.ok || typeof filePath !== "string" || !filePath) throw new Error("Telegram file lookup failed (" + response.status + ").");
  const download = await fetch("https://api.telegram.org/file/bot" + token + "/" + filePath, { cache: "no-store" });
  if (download.status === 404) return null;
  if (!download.ok) throw new Error("Telegram file download failed (" + download.status + ").");
  return { bytes: new Uint8Array(await download.arrayBuffer()), filePath };
}

export async function uploadPrivatePaymentProof(orderId: string, bytes: Uint8Array) {
  const stored = await storeTelegramFile(bytes, "payment-proof-" + orderId.slice(0, 40) + ".jpg", "image/jpeg", "Private payment proof · Order " + orderId);
  return stored.fileId;
}
export async function deletePrivateStorageObject(_fileId: string) {
  // Telegram Bot API does not provide a deleteFile method. Unclaimed uploads remain in the admin chat.
}
export async function readPrivatePaymentProof(fileId: string) {
  const file = await readTelegramFile(fileId);
  return file?.bytes || null;
}
