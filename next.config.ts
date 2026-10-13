import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Next's default is 1MB, well under the GP Dashboard upload's own
      // 10MB cap (uploadGpDashboard, upload/actions.ts) — without raising
      // this, Next itself rejects the request with "Body exceeded 1 MB
      // limit" before the action's own size check ever runs.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
