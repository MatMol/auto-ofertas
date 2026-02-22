import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "http2.mlstatic.com",
      },
      {
        protocol: "https",
        hostname: "*.mlstatic.com",
      },
      {
        protocol: "https",
        hostname: "images.prd.kavak.io",
      },
      {
        protocol: "https",
        hostname: "*.kavak.io",
      },
      {
        protocol: "https",
        hostname: "acroadtrip.blob.core.windows.net",
      },
      {
        protocol: "https",
        hostname: "acnews.blob.core.windows.net",
      },
    ],
  },
};

export default nextConfig;
