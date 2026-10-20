import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.*.*"],
  serverExternalPackages: ["@napi-rs/canvas", "unpdf"],
  outputFileTracingIncludes: {
    "/api/**": ["./prompts/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
