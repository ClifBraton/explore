import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Fallback for node modules in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        worker_threads: false,
      };
    }
    
    // Ignore pino/thread-stream test files
    config.resolve.alias = {
      ...config.resolve.alias,
      "thread-stream/test": false,
      "pino/test": false,
    };
    
    return config;
  },
};

export default nextConfig;
