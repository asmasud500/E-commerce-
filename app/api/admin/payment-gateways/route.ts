import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { z } from "zod";

const schema=z.object({
 name:z.string().min(2), type:z.enum(["SSLCOMMERZ","BKASH","NAGAD","ROCKET","BANGLA_QR","CUSTOM"]),
 mode:z.enum(["SANDBOX","LIVE"]).default("SANDBOX"), enabled:z.boolean().default(false),
 sortOrder:z.number().int().default(0), apiBaseUrl:z.string().url().optional().or(z.literal("")),
 publicConfig:z.record(z.string(),z.any()).optional(),
 encryptedSecrets:z.string().optional(), qrImageUrl:z.string().url().optional().or(z.literal("")),
 qrMerchantName:z.string().optional()
});
export async function GET(){return NextResponse.json(await db.paymentGateway.findMany({orderBy:{sortOrder:"asc"}}))}
export async function POST(req:NextRequest){
 try{const b=schema.parse(await req.json());const g=await db.paymentGateway.create({data:{...b,apiBaseUrl:b.apiBaseUrl||null,qrImageUrl:b.qrImageUrl||null,publicConfig:b.publicConfig||{}}});return NextResponse.json(g,{status:201})}
 catch{return NextResponse.json({error:"Invalid gateway configuration"},{status:400})}
}
