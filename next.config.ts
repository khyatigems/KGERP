import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows an isolated local UI review without sharing the normal dev-server lock.
  distDir: process.env.ERP_REVIEW_DIST_DIR || ".next",
  /* config options here */
  serverExternalPackages: ["puppeteer", "puppeteer-core", "canvas"],
  reactCompiler: true,
  experimental: {
    viewTransition: true,
  },
  cacheLife: {
    page: {
      stale: 60,
      revalidate: 60,
      expire: 3600,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "cdn.khyatigems.com",
      },
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
    ],
  },
};

export default nextConfig;
