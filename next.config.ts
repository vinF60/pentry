import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "dist",           // ✅ build output folder named 'dist'
  trailingSlash: true,
  images: {
    unoptimized: true,       // ✅ required for static export
  },
  basePath: "/pipex-error-system",    // ✅ your htdocs subfolder name
  assetPrefix: "/pipex-error-system", // ✅ fixes CSS/JS loading
};

export default nextConfig;