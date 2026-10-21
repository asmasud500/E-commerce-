import type {NextConfig} from "next";
const securityHeaders=[{key:"X-Content-Type-Options",value:"nosniff"},{key:"X-Frame-Options",value:"DENY"},{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},{key:"Permissions-Policy",value:"camera=(),microphone=(),geolocation=(self),payment=()"},{key:"Strict-Transport-Security",value:"max-age=31536000; includeSubDomains"},{key:"Cross-Origin-Opener-Policy",value:"same-origin"},{key:"Content-Security-Policy",value:"frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://sandbox.sslcommerz.com https://securepay.sslcommerz.com"}];
const nextConfig:NextConfig={async headers(){return [{source:"/:path*",headers:securityHeaders}]},poweredByHeader:false};
export default nextConfig;
import {initOpenNextCloudflareForDev} from "@opennextjs/cloudflare";initOpenNextCloudflareForDev();
