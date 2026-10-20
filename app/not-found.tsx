import Link from "next/link";
import StoreHeader from "@/components/StoreHeader";
import StoreFooter from "@/components/StoreFooter";
export default function NotFound(){
  return <><StoreHeader/><main className="pg"><section className="pg-card info-page" style={{textAlign:"center"}}><h1>Page not found</h1><p>The page you are looking for does not exist or has moved.</p><p><Link href="/" className="pg-btn">Back to home</Link> <Link href="/products" className="pg-btn pg-btn-line">Browse products</Link></p></section></main><StoreFooter/></>;
}
