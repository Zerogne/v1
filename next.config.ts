import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Externalize 'pg' to prevent bundling in client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        pg: false,
      };
    }
    return config;
  },
  // Empty turbopack config to silence warning
  // The 'server-only' imports will prevent client-side usage
  turbopack: {},
};

export default nextConfig;
