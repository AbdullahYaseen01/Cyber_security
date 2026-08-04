/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tabs",
      "@tanstack/react-query",
    ],
  },
  async redirects() {
    return [
      { source: "/cloud", destination: "/dashboard/cloud-guard", permanent: true },
      { source: "/agents", destination: "/dashboard/agent-security", permanent: true },
      { source: "/api-security", destination: "/dashboard/api-security", permanent: true },
      { source: "/phishing", destination: "/dashboard/phishing-shield", permanent: true },
      { source: "/darkweb", destination: "/dashboard/dark-web", permanent: true },
      { source: "/compliance", destination: "/dashboard/compliance", permanent: true },
      { source: "/reports", destination: "/dashboard/reports", permanent: true },
      { source: "/academy", destination: "/dashboard/academy", permanent: true },
      { source: "/settings", destination: "/dashboard/settings", permanent: true },
      { source: "/scanner", destination: "/dashboard/scanner", permanent: true },
      { source: "/auth/login", destination: "/login", permanent: true },
      { source: "/auth/signup", destination: "/signup", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
