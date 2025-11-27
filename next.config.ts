import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Do not set COOP/COEP headers to avoid conflicts with wallet SDK
  // FHEVM SDK will use single-threaded fallback mode
};

export default nextConfig;
