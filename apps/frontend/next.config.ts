import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["loveble.app", "*.loveble.app"],
  transpilePackages: [
    "@loveble/types",
    "@loveble/validation",
    "@loveble/utils",
    "@loveble/ui",
  ],
};

export default nextConfig;
