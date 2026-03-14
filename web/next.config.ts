import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is default in Next.js 16; empty config silences the webpack warning
  turbopack: {},
};

export default nextConfig;
