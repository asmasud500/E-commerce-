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

export async function saveProductImage(productId:string,bytes:Uint8Array,mime:string,alt?:string|null){
  if(!MIME.has(mime))throw new Error("Only JPEG, PNG or WebP images are supported.");
  if(!bytes.length||bytes.length>MAX_IMAGE_BYTES)throw new Error("Image is too large. Please use one under 650 KB.");
  const product=await db.product.findUnique({where:{id:productId},select:{sku:true,name:true}});
  if(!product)throw new Error("Product not found.");
  const filename="product-"+product.sku+"-"+crypto.randomUUID().slice(0,8)+"."+EXT[mime];
  const stored=await storeTelegramFile(bytes,filename,mime,"Product image · "+product.name+" · SKU "+product.sku);
  await mirrorOrLog(bytes,filename,mime);
  const existing=await db.productImage.findMany({where:{productId}});
  return db.productImage.create({data:{productId,url:"/api/telegram/files/"+encodeURIComponent(stored.fileId),alt:alt||null,sortOrder:existing.length}});
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
      const path=file.filePath.toLowerCase();
      const mime=path.endsWith(".png")?"image/png":path.endsWith(".webp")?"image/webp":"image/jpeg";
      await mirrorOrLog(file.bytes,"product-"+product.sku+"-telegram-"+crypto.randomUUID().slice(0,8)+"."+EXT[mime],mime);
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
  const stored=await storeTelegramFile(bytes,filename,mime,"Uploaded website image");
  await mirrorOrLog(bytes,filename,mime);
  await db.imageBlob.create({data:{id:blobId,mime,telegramFileId:stored.fileId}});
  return "/api/img/"+blobId;
}
