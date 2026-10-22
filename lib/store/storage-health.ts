import { db } from "@/lib/prisma";
import { readTelegramFile } from "@/lib/telegram/file-storage";
import { readGoogleDriveImage } from "@/lib/google-drive/file-storage";
import { telegramApi } from "@/lib/notifications/telegram-admin";

const sha256 = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer as ArrayBuffer);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
};

export async function checkStorageProviders() {
  const check = async (name: string, fn: () => Promise<unknown>) => {
    const start = Date.now();
    try { await fn(); return { name, status: "HEALTHY", latencyMs: Date.now() - start, checkedAt: new Date().toISOString() }; }
    catch (error) { return { name, status: "DEGRADED", latencyMs: Date.now() - start, checkedAt: new Date().toISOString(), error: (error instanceof Error ? error.message : "Probe failed").slice(0, 160) }; }
  };
  const [database, telegram, drive] = await Promise.all([
    check("Firestore", async () => { await db.storageAsset.findMany({ take: 1 }); }),
    check("Telegram", async () => {
      const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
      if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
      const response = await fetch("https://api.telegram.org/bot" + token + "/getMe", { cache: "no-store" });
      const result: any = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error("Telegram API probe failed (" + response.status + ")");
    }),
    check("Google Drive", async () => {
      const sample = (await db.storageAsset.findMany({ orderBy: { updatedAt: "desc" }, take: 100 })).find((row: any) => Boolean(row.driveFileId));
      if (!sample?.driveFileId) {
        if (!process.env.GOOGLE_DRIVE_CLIENT_ID && !process.env.GOOGLE_DRIVE_CLIENT_EMAIL) throw new Error("Google Drive credentials are not configured");
        throw new Error("No backed-up file is available for a read probe");
      }
      const result = await readGoogleDriveImage(String(sample.driveFileId));
      if (!result?.bytes?.length) throw new Error("Drive sample file could not be read");
    })
  ]);
  return { checkedAt: new Date().toISOString(), providers: [database, telegram, drive] };
}

export async function runStorageIntegrityScan(limit = 25) {
  const rows = (await db.imageBlob.findMany({ orderBy: { updatedAt: "desc" }, take: 500 })).filter((row: any) => Boolean(row.telegramFileId)).slice(0, Math.max(1, Math.min(100, limit)));
  const report = { scanned: 0, healthy: 0, missingPrimary: 0, checksumMismatch: 0, missingBackupReference: 0, errors: 0, issues: [] as Array<{ id: string; issue: string }> };
  for (const row of rows) {
    report.scanned++;
    try {
      const primary = await readTelegramFile(String(row.telegramFileId || ""));
      if (!primary?.bytes?.length) {
        if (row.driveFileId) {
          const backup = await readGoogleDriveImage(String(row.driveFileId));
          if (backup?.bytes?.length && (!row.checksum || await sha256(backup.bytes) === String(row.checksum))) {
            report.healthy++;
            report.issues.push({ id: String(row.id), issue: "Primary Telegram file missing; Drive backup verified (failover available)." });
          } else { report.missingPrimary++; report.issues.push({ id: String(row.id), issue: "Primary missing and Drive backup unavailable or invalid." }); }
        } else { report.missingPrimary++; report.issues.push({ id: String(row.id), issue: "Primary Telegram file missing; no backup reference." }); }
        continue;
      }
      if (row.checksum && await sha256(primary.bytes) !== String(row.checksum)) {
        report.checksumMismatch++;
        report.issues.push({ id: String(row.id), issue: "Primary checksum mismatch." });
        continue;
      }
      if (!row.driveFileId) report.missingBackupReference++;
      report.healthy++;
    } catch {
      report.errors++;
      report.issues.push({ id: String(row.id), issue: "Could not complete remote integrity check; retry later." });
    }
  }
  return report;
}

export async function verifyStorageRestore(limit = 5) {
  const rows = (await db.storageAsset.findMany({ orderBy: { updatedAt: "desc" }, take: 500 })).filter((row: any) => Boolean(row.driveFileId)).slice(0, Math.max(1, Math.min(10, limit)));
  const report = { checked: 0, verified: 0, failed: 0, results: [] as Array<{ id: string; status: string; bytes?: number }> };
  for (const row of rows) {
    report.checked++;
    try {
      const file = await readGoogleDriveImage(String(row.driveFileId));
      if (!file?.bytes?.length) throw new Error("Backup cannot be read");
      if (row.checksum && await sha256(file.bytes) !== String(row.checksum)) throw new Error("Checksum mismatch");
      report.verified++;
      report.results.push({ id: String(row.id), status: "VERIFIED", bytes: file.bytes.byteLength });
    } catch {
      report.failed++;
      report.results.push({ id: String(row.id), status: "FAILED" });
    }
  }
  return report;
}

export async function sendStorageAlert(title: string, details: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return { sent: false, reason: "Telegram alert credentials are not configured." };
  const key = title + ":" + details.slice(0, 100);
  try {
    const recent = await db.auditLog.findMany({ where: { action: "STORAGE_ALERT_SENT", entity: "Storage", createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } }, orderBy: { createdAt: "desc" }, take: 50 });
    if (recent.some((entry: any) => String(entry.metadata?.key || "") === key)) return { sent: false, reason: "Duplicate alert suppressed for 30 minutes." };
    const response = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: "⚠️ MART STORAGE ALERT\n" + title + "\n" + details.slice(0, 2500), disable_web_page_preview: true }), cache: "no-store" });
    const result: any = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) throw new Error("Telegram alert delivery failed.");
    await db.auditLog.create({ data: { actorId: "system", action: "STORAGE_ALERT_SENT", entity: "Storage", entityId: null, metadata: { key, title }, createdAt: new Date() } });
    return { sent: true };
  } catch (error) {
    console.error("Storage alert failed:", error instanceof Error ? error.message : "Unknown error");
    return { sent: false, reason: "Alert delivery failed; check Telegram configuration." };
  }
}
