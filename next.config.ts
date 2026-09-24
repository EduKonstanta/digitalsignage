import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep Turbopack development artifacts separate from production builds.
  // Running `next build` while `next dev` is active must not remove the dev
  // build manifests that power RSC navigation and the error overlay.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  // next/image is only ever used for local assets under /public today
  // (see components/display/signage-*.tsx) — no remotePatterns needed.
  // Add specific hostnames here if a remote <Image> source is introduced.
};

export default nextConfig;
