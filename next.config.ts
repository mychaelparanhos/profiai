import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep heavy server-only packages out of the Turbopack bundle
  serverExternalPackages: ['adm-zip'],
};

export default nextConfig;
