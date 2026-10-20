import {db} from "@/lib/prisma";

/** Firestore documents are capped at 1 MiB and base64 adds a third, so keep the raw bytes well below that. */
export const MAX_IMAGE_BYTES=650_000;
const MIME=new Set(["image/jpeg","image/png","image/webp"]);

export async function saveProductImage(productId:string,bytes:Uint8Array,mime:string,alt?:string|null){
  if(!MIME.has(mime))throw new Error("Only JPEG, PNG or WebP images are supported.");
  if(!bytes.length||bytes.length>MAX_IMAGE_BYTES)throw new Error("Image is too large. Please use one under 650 KB.");
  const blobId=crypto.randomUUID().replace(/-/g,"").slice(0,24);
  await db.imageBlob.create({data:{id:blobId,mime,data:Buffer.from(bytes).toString("base64")}});
  const existing=await db.productImage.findMany({where:{productId}});
  return db.productImage.create({data:{productId,url:"/api/img/"+blobId,alt:alt||null,sortOrder:existing.length}});
}

export function parseDataUrl(dataUrl:string){
  const m=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl||"");
  if(!m)return null;
  return {mime:m[1],bytes:new Uint8Array(Buffer.from(m[2],"base64"))};
}

/** Remove the stored bytes behind an uploaded image (no-op for external URLs). */
export async function deleteImageBlobForUrl(url:string){
  const m=/^\/api\/img\/([a-z0-9]+)$/.exec(url||"");
  if(m)await db.imageBlob.delete({where:{id:m[1]}}).catch(()=>{});
}

/** Store a review photo and return its public URL (no product image row). */
export async function saveBlobImage(bytes:Uint8Array,mime:string){
  if(!MIME.has(mime))throw new Error("Only JPEG, PNG or WebP images are supported.");
  if(!bytes.length||bytes.length>MAX_IMAGE_BYTES)throw new Error("Image is too large. Please use one under 650 KB.");
  const blobId=crypto.randomUUID().replace(/-/g,"").slice(0,24);
  await db.imageBlob.create({data:{id:blobId,mime,data:Buffer.from(bytes).toString("base64")}});
  return "/api/img/"+blobId;
}
