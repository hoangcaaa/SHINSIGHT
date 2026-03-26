import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {},
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${supabaseUrl}/functions/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
