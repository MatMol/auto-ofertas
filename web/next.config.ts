import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import path from "node:path";
if (process.env.NODE_ENV === "development") initOpenNextCloudflareForDev();
const nextConfig: NextConfig = {
  images: { unoptimized: true },
  turbopack: { root: path.resolve(__dirname, "..") },
};
export default nextConfig;
