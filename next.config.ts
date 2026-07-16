import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  productionBrowserSourceMaps: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;