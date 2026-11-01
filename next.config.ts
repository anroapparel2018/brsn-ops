import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Les instructions des agents (docs/agents/*.md) sont lues par le serveur.
  outputFileTracingIncludes: {
    "/*": ["./docs/agents/**/*"],
  },
  partialPrefetching: true,
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
