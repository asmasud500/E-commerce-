import {NextResponse} from "next/server";
import {db} from "@/lib/firestore";

export async function GET(){
  try{
    const categories=await db.category.findMany({orderBy:{name:"asc"}});
    return NextResponse.json(
      categories.map((c:any)=>({name:c.name,slug:c.slug})),
      {headers:{"Cache-Control":"public, max-age=300, stale-while-revalidate=600"}}
    );
  }catch(error){
    console.error("Categories API error:",error instanceof Error?error.message:String(error));
    return NextResponse.json([],{status:200});
  }
}
