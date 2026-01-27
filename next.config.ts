import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
