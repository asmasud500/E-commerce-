import {db} from "@/lib/prisma";
import {storeTelegramFile,readTelegramFile} from "@/lib/telegram/file-storage";
import {mirrorImageToGoogleDriveWithRetry} from "@/lib/google-drive/file-storage";

/** Keep image payloads out of Firestore documents; store only metadata and durable file references. */
export const MAX_IMAGE_BYTES=650_000;
const MIME=new Set(["image/jpeg","image/png","image/webp"]);
const EXT:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};

async function mirrorOrLog(bytes:Uint8Array,filename:string,mime:string){
  try{
    const result=await mirrorImageToGoogleDriveWithRetry(bytes,filename,mime);
    if(!result.configured)console.warn("Google Drive image backup disabled: required GOOGLE_DRIVE_* secrets are missing.");
    return result;
  }catch(error){
    // Keep primary upload available if the optional backup is temporarily down; retry details are logged by the helper.
    console.error("Google Drive image backup failed after retries:",error instanceof Error?error.message:String(error));
    return {configured:true as const,fileId:null,backupFailed:true as const};
  }
}

async function checksumOf(bytes:Uint8Array){
  const digest=await crypto.subtle.digest("SHA-256",Uint8Array.from(bytes).buffer as ArrayBuffer);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function validImageBytes(bytes:Uint8Array,mime:string){
  if(mime==="image/jpeg")return bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(mime==="image/png")return bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  if(mime==="image/webp")return bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP";
  return false;
}
async function registerStorageAsset(args:{checksum:string;mime:string;size:number;filename:string;telegramFileId:string;driveFileId?:string|null;backupStatus:string}){
  const existing=await db.storageAsset.findMany({where:{checksum:args.checksum},take:1});
  const data={...args,updatedAt:new Date()};
  if(existing[0])return db.storageAsset.update({where:{id:existing[0].id},data:{...data,driveFileId:args.driveFileId||existing[0].driveFileId||null}});
  return db.storageAsset.create({data:{id:args.checksum.slice(0,24),...data,createdAt:new Date()}});
}
async function enqueueBackup(args:{checksum:string;telegramFileId:string;filename:string;mime:string;size:number}){
  const id=args.checksum.slice(0,24);
  const existing=await db.storageBackupJob.findMany({where:{id},take:1});
  const data={...args,status:"PENDING",attempts:0,nextAttemptAt:new Date(),lastError:null,updatedAt:new Date()};
  if(existing[0])return db.storageBackupJob.update({where:{id},data});
  return db.storageBackupJob.create({data:{id,...data,createdAt:new Date()}});
}
export async function saveProductImage(productId:string,bytes:Uint8Array,mime:string,alt?:string|null){
  if(!MIME.has(mime))throw new Error("Only JPEG, PNG or WebP images are supported.");
  if(!bytes.length||bytes.length>MAX_IMAGE_BYTES)throw new Error("Image is too large. Please use one under 650 KB.");
  if(!validImageBytes(bytes,mime))throw new Error("Image content does not match its declared file type.");
  const product=await db.product.findUnique({where:{id:productId},select:{sku:true,name:true}});
  if(!product)throw new Error("Product not found.");
  const checksum=await checksumOf(bytes);
  const filename="product-"+product.sku+"-"+checksum.slice(0,12)+"."+EXT[mime];
  const matches=await db.storageAsset.findMany({where:{checksum},take:1});
  const stored=matches[0]?.telegramFileId?{fileId:String(matches[0].telegramFileId)}:await storeTelegramFile(bytes,filename,mime,"Product image · "+product.name+" · SKU "+product.sku);
  let backup:{configured:boolean;fileId:string|null;backupFailed?:boolean}={configured:false,fileId:null};
  try{backup=await mirrorOrLog(bytes,filename,mime) as typeof backup;}catch{}
  const backupStatus=backup.fileId?"COMPLETE":backup.configured?"PENDING":"DISABLED";
  await registerStorageAsset({checksum,mime,size:bytes.byteLength,filename,telegramFileId:stored.fileId,driveFileId:backup.fileId,backupStatus});
  if(backup.configured&&!backup.fileId)await enqueueBackup({checksum,telegramFileId:stored.fileId,filename,mime,size:bytes.byteLength});
  const existing=await db.productImage.findMany({where:{productId}});
  return db.productImage.create({data:{productId,url:"/api/telegram/files/"+encodeURIComponent(stored.fileId),alt:alt||null,sortOrder:existing.length,checksum,mime,size:bytes.byteLength,driveFileId:backup.fileId||null,backupStatus}});
}

/** Reuse Telegram file IDs and mirror their actual bytes to Drive, too. */
export async function saveProductImageFromTelegramFileId(productId:string,fileId:string,alt?:string|null){
  if(!fileId||fileId.length>512||!/^[A-Za-z0-9_-]+$/.test(fileId))throw new Error("Invalid Telegram image reference.");
  const product=await db.product.findUnique({where:{id:productId},select:{sku:true,name:true}});
  if(!product)throw new Error("Product not found.");
  const existing=await db.productImage.findMany({where:{productId}});
  try{
    const file=await readTelegramFile(fileId);
    if(file?.bytes?.length){
      if(file.bytes.length>MAX_IMAGE_BYTES)throw new Error("Telegram image exceeds the 650 KB image limit.");
      const path=file.filePath.toLowerCase();
      const mime=path.endsWith(".png")?"image/png":path.endsWith(".webp")?"image/webp":"image/jpeg";
      if(!validImageBytes(file.bytes,mime))throw new Error("Telegram image content is invalid.");
      const checksum=await checksumOf(file.bytes);
      const filename="product-"+product.sku+"-"+checksum.slice(0,12)+"."+EXT[mime];
      let backup:{configured:boolean;fileId:string|null;backupFailed?:boolean}={configured:false,fileId:null};
      try{backup=await mirrorOrLog(file.bytes,filename,mime) as typeof backup;}catch{}
      const backupStatus=backup.fileId?"COMPLETE":backup.configured?"PENDING":"DISABLED";
      await registerStorageAsset({checksum,mime,size:file.bytes.byteLength,filename,telegramFileId:fileId,driveFileId:backup.fileId,backupStatus});
      if(backup.configured&&!backup.fileId)await enqueueBackup({checksum,telegramFileId:fileId,filename,mime,size:file.bytes.byteLength});
    }else{
      console.warn("Drive backup skipped: Telegram file could not be read for existing file_id.");
    }
  }catch(error){console.error("Drive mirror for Telegram file_id failed:",error instanceof Error?error.message:String(error));}
  return db.productImage.create({data:{productId,url:"/api/telegram/files/"+encodeURIComponent(fileId),alt:alt||null,sortOrder:existing.length}});
}

export function parseDataUrl(dataUrl:string){
  const m=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl||"");
  if(!m)return null;
  return {mime:m[1],bytes:new Uint8Array(Buffer.from(m[2],"base64"))};
}

/** Legacy cleanup for image blobs created by older versions. */
export async function deleteImageBlobForUrl(url:string){
  const m=/^\/api\/img\/([a-z0-9]+)$/.exec(url||"");
  if(m)await db.imageBlob.delete({where:{id:m[1]}}).catch(()=>{});
}

/** Review/general images: Telegram stores bytes; Firestore stores only MIME + Telegram reference. */
export async function saveBlobImage(bytes:Uint8Array,mime:string){
  if(!MIME.has(mime))throw new Error("Only JPEG, PNG or WebP images are supported.");
  if(!bytes.length||bytes.length>MAX_IMAGE_BYTES)throw new Error("Image is too large. Please use one under 650 KB.");
  const blobId=crypto.randomUUID().replace(/-/g,"").slice(0,24);
  const filename="uploaded-image-"+blobId+"."+EXT[mime];
  const checksum=await checksumOf(bytes);
  const matches=await db.storageAsset.findMany({where:{checksum},take:1});
  const stored=matches[0]?.telegramFileId?{fileId:String(matches[0].telegramFileId)}:await storeTelegramFile(bytes,filename,mime,"Uploaded website image");
  let backup:{configured:boolean;fileId:string|null;backupFailed?:boolean}={configured:false,fileId:null};
  try{backup=await mirrorOrLog(bytes,filename,mime) as typeof backup;}catch{}
  const backupStatus=backup.fileId?"COMPLETE":backup.configured?"PENDING":"DISABLED";
  await registerStorageAsset({checksum,mime,size:bytes.byteLength,filename,telegramFileId:stored.fileId,driveFileId:backup.fileId,backupStatus});
  if(backup.configured&&!backup.fileId)await enqueueBackup({checksum,telegramFileId:stored.fileId,filename,mime,size:bytes.byteLength});
  await db.imageBlob.create({data:{id:blobId,mime,telegramFileId:stored.fileId,checksum,size:bytes.byteLength,driveFileId:backup.fileId||null,backupStatus}});
  return "/api/img/"+blobId;
}
