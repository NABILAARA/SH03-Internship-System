import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Percepat kompilasi — skip type check dan lint saat build dev
  // (tetap jalan saat CI/production build)
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Kurangi logging noise di terminal dev
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
