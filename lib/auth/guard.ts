import {cookies} from "next/headers";
import {verifyAdminToken} from "@/lib/auth/admin";
export async function requireAdmin(){
 const token=(await cookies()).get("admin_session")?.value;
 if(!token||!verifyAdminToken(token))throw new Error("UNAUTHORIZED");
}
