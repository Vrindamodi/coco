import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@coco/ui", "@coco/shared-types"],
};

export default nextConfig;
