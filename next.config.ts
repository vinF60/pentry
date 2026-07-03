import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: "dist",           // ✅ build output folder named 'dist'
  trailingSlash: true,
  images: {
    unoptimized: true,       // ✅ required for static export
  },
  // basePath: "./",    // ✅ your htdocs subfolder name
  // assetPrefix: "./", // ✅ fixes CSS/JS loading
};

export default nextConfig;