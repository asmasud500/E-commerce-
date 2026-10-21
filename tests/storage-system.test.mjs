import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=(path)=>readFile(new URL(path,import.meta.url),"utf8");
test("image uploads validate actual signatures and track checksum metadata without Base64 payloads",async()=>{
 const source=await read("../lib/store/images.ts");
 assert.match(source,/crypto\.subtle\.digest\("SHA-256",Uint8Array\.from\(bytes\)\.buffer as ArrayBuffer\)/);
 assert.match(source,/function validImageBytes/);
 assert.match(source,/Image content does not match its declared file type/);
 assert.match(source,/storageAsset\.findMany\(\{where:\{checksum\}/);
 assert.match(source,/telegramFileId:stored\.fileId/);
 assert.doesNotMatch(source,/data:\{id:blobId,mime,telegramFileId:stored\.fileId,data:/);
});
test("failed Drive image backups are persisted in a retry queue and processed with bounded batches",async()=>{
 const source=await read("../lib/store/images.ts");
 const ops=await read("../lib/store/storage-operations.ts");
 assert.match(source,/storageBackupJob\.create/);
 assert.match(source,/status:"PENDING"/);
 assert.match(ops,/processStorageBackupQueue/);
 assert.match(ops,/Math\.max\(1,Math\.min\(25,limit\)\)/);
 assert.match(ops,/attempts>=8/);
 assert.match(ops,/mirrorImageToGoogleDriveWithRetry/);
});
test("storage admin API is authenticated and returns non-cacheable monitoring data",async()=>{
 const route=await read("../app/api/admin/storage/route.ts");
 assert.match(route,/readAdminSession/);
 assert.match(route,/canAccessAdminPath/);
 assert.match(route,/Cache-Control/);
 assert.match(route,/getStorageOverview/);
 assert.match(route,/processStorageBackupQueue/);
});
test("storage registry collections are available in Firestore adapter",async()=>{
 const source=await read("../lib/firestore.ts");
 assert.match(source,/storageAsset:"storageAssets"/);
 assert.match(source,/storageBackupJob:"storageBackupJobs"/);
});

test("scheduled backup retry endpoint requires CRON_SECRET and disables caching",async()=>{ const route=await read("../app/api/cron/storage-backups/route.ts"); assert.match(route,/process\.env\.CRON_SECRET/); assert.match(route,/authorization/); assert.match(route,/status:401/); assert.match(route,/processStorageBackupQueue/); assert.match(route,/Cache-Control/); });

test("Google Drive mirror supports OAuth refresh tokens for personal My Drive quota",async()=>{
 const source=await read("../lib/google-drive/file-storage.ts");
 const docs=await read("../docs/telegram-file-storage.md");
 assert.match(source,/GOOGLE_DRIVE_CLIENT_ID/);
 assert.match(source,/GOOGLE_DRIVE_CLIENT_SECRET/);
 assert.match(source,/GOOGLE_DRIVE_REFRESH_TOKEN/);
 assert.match(source,/grant_type: "refresh_token"/);
 assert.match(source,/mode: "oauth"/);
 assert.match(docs,/personal Gmail \/ My Drive folder: OAuth refresh-token credentials/);
 assert.match(docs,/Shared Drive/);
});

test("public product images fail over to checksum-verified Google Drive backups",async()=>{
 const route=await read("../app/api/telegram/files/[fileId]/route.ts");
 const drive=await read("../lib/google-drive/file-storage.ts");
 assert.match(route,/readGoogleDriveImage/);
 assert.match(route,/publicImage\?\.driveFileId/);
 assert.match(route,/checksumMatches\(backup\.bytes,publicImage\.checksum\)/);
 assert.match(route,/imageResponse\(backup\.bytes,backup\.mime,true,"google-drive"\)/);
 assert.match(drive,/drive\/v3\/files\//);
 assert.match(drive,/cache: "no-store"/);
});
