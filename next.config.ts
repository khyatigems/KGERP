import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows an isolated local UI review without sharing the normal dev-server lock.
  distDir: process.env.ERP_REVIEW_DIST_DIR || ".next",
  /* config options here */
  serverExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium", "canvas"],
  outputFileTracingIncludes: {
    "/api/settings/weekly-reports/\\[\\[\\.\\.\\.path\\]\\]": ["./node_modules/@sparticuz/chromium/bin/**/*", "./public/brand/khyatigems-logo.png", "./public/fonts/brand-font-0.ttf"],
    "/api/cron/reports/weekly": ["./node_modules/@sparticuz/chromium/bin/**/*", "./public/brand/khyatigems-logo.png", "./public/fonts/brand-font-0.ttf"],
  },
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
