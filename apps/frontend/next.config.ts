import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@loveble/types",
    "@loveble/validation",
    "@loveble/utils",
    "@loveble/ui",
  ],
};

export default nextConfig;
