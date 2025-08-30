// next.config.ts
import type { NextConfig } from "next";
import type { Configuration as WebpackConfig } from "webpack";

const nextConfig: NextConfig = {
  // Your other Next.js config options go here

  // Add this webpack configuration
  webpack: (config: WebpackConfig, { isServer }) => {
    // Fixes hot-reloading in some setups
    if (!isServer) {
      // `config.watchOptions` is not on the strict WebpackConfig type, so cast to any
      (config as any).watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding (ms)
      };
    }
    return config;
  },
};

export default nextConfig;
