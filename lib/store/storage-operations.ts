import {db} from "@/lib/prisma";
import {readTelegramFile} from "@/lib/telegram/file-storage";
import {mirrorImageToGoogleDriveWithRetry} from "@/lib/google-drive/file-storage";

const now=()=>new Date();

/** Retry due backup jobs from durable Firestore records. Image bytes are re-read from Telegram, never stored in the queue. */
export async function processStorageBackupQueue(limit=10){
  const jobs=await db.storageBackupJob.findMany({where:{status:{in:["PENDING","FAILED"]}},orderBy:{nextAttemptAt:"asc"},take:Math.max(1,Math.min(25,limit))});
  const results={processed:0,succeeded:0,failed:0,skipped:0};
  for(const job of jobs){
    if(job.nextAttemptAt&&new Date(job.nextAttemptAt).getTime()>Date.now()){results.skipped++;continue;}
    results.processed++;
    const attempts=Number(job.attempts||0)+1;
    try{
      const file=await readTelegramFile(String(job.telegramFileId||""));
      if(!file?.bytes?.length)throw new Error("Primary Telegram image is unavailable.");
      const drive=await mirrorImageToGoogleDriveWithRetry(file.bytes,String(job.filename||"image"),String(job.mime||"image/jpeg"));
      if(!drive.configured)throw new Error("Google Drive backup is not configured.");
      await db.storageBackupJob.update({where:{id:job.id},data:{status:"COMPLETE",attempts,driveFileId:drive.fileId,lastError:null,completedAt:now(),updatedAt:now()}});
      const assets=await db.storageAsset.findMany({where:{checksum:job.checksum},take:1});
      if(assets[0])await db.storageAsset.update({where:{id:assets[0].id},data:{driveFileId:drive.fileId,backupStatus:"COMPLETE",updatedAt:now()}});
      const productImages=await db.productImage.findMany({where:{checksum:job.checksum}});
      for(const image of productImages)await db.productImage.update({where:{id:image.id},data:{driveFileId:drive.fileId,backupStatus:"COMPLETE"}});
      const blobs=await db.imageBlob.findMany({where:{checksum:job.checksum}});
      for(const blob of blobs)await db.imageBlob.update({where:{id:blob.id},data:{driveFileId:drive.fileId,backupStatus:"COMPLETE"}});
      results.succeeded++;
    }catch(error){
      const message=(error instanceof Error?error.message:String(error)).slice(0,240);
      const exhausted=attempts>=8;
      const delay=Math.min(24*60*60*1000,30_000*2**Math.min(attempts-1,10));
      await db.storageBackupJob.update({where:{id:job.id},data:{status:exhausted?"FAILED":"PENDING",attempts,lastError:message,nextAttemptAt:new Date(Date.now()+delay),updatedAt:now()}}).catch(()=>{});
      await db.storageAsset.update({where:{id:String(job.checksum).slice(0,24)},data:{backupStatus:exhausted?"FAILED":"PENDING",updatedAt:now()}}).catch(()=>{});
      console.error("Storage backup job failed:",{jobId:job.id,attempts,exhausted,message});
      results.failed++;
    }
  }
  return results;
}

export async function getStorageOverview(){
  const [assets,jobs,images,blobs]=await Promise.all([
    db.storageAsset.findMany({orderBy:{updatedAt:"desc"},take:500}),
    db.storageBackupJob.findMany({orderBy:{updatedAt:"desc"},take:500}),
    db.productImage.findMany({take:1000}),
    db.imageBlob.findMany({take:1000})
  ]);
  const byStatus=(rows:any[],status:string)=>rows.filter(row=>String(row.backupStatus||row.status||"").toUpperCase()===status).length;
  return {
    totalAssets:assets.length,
    totalBytes:assets.reduce((sum:number,row:any)=>sum+Number(row.size||0),0),
    duplicateSavingsBytes:assets.reduce((sum:number,row:any)=>sum+Number(row.duplicateBytesSaved||0),0),
    backupComplete:assets.filter((row:any)=>row.backupStatus==="COMPLETE").length,
    backupPending:jobs.filter((row:any)=>row.status==="PENDING").length,
    backupFailed:jobs.filter((row:any)=>row.status==="FAILED").length,
    legacyBase64Images:blobs.filter((row:any)=>Boolean(row.data)).length,
    productImageRecords:images.length,
    reviewImageRecords:blobs.length,
    assets:assets.slice(0,100).map((row:any)=>({id:row.id,filename:row.filename,mime:row.mime,size:row.size,backupStatus:row.backupStatus,updatedAt:row.updatedAt})),
    jobs:jobs.slice(0,100).map((row:any)=>({id:row.id,filename:row.filename,status:row.status,attempts:row.attempts,nextAttemptAt:row.nextAttemptAt,lastError:row.lastError,updatedAt:row.updatedAt}))
  };
}
