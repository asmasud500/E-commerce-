import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;

// Enables the local `next dev` experience to also work against Cloudflare
// bindings (KV/D1/etc.) when running under the OpenNext Cloudflare adapter.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
