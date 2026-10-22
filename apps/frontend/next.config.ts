import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["app.loveble.localhost", "*.app.loveble.localhost"],
  transpilePackages: [
    "@loveble/types",
    "@loveble/validation",
    "@loveble/utils",
    "@loveble/ui",
  ],
};

export default nextConfig;
