/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tabs",
    ],
  },
  async redirects() {
    return [
      { source: "/cloud", destination: "/dashboard/cloud-guard", permanent: false },
      { source: "/agents", destination: "/dashboard/agent-security", permanent: false },
      { source: "/api-security", destination: "/dashboard/api-security", permanent: false },
      { source: "/phishing", destination: "/dashboard/phishing-shield", permanent: false },
      { source: "/darkweb", destination: "/dashboard/dark-web", permanent: false },
      { source: "/compliance", destination: "/dashboard/compliance", permanent: false },
      { source: "/reports", destination: "/dashboard/reports", permanent: false },
      { source: "/academy", destination: "/dashboard/academy", permanent: false },
      { source: "/settings", destination: "/dashboard/settings", permanent: false },
      { source: "/scanner", destination: "/dashboard/scanner", permanent: false },
      { source: "/auth/login", destination: "/login", permanent: false },
    ];
  },
  async rewrites() {
    const scannerUrl = process.env.SCANNER_API_URL ?? "http://127.0.0.1:8080";
    return [
      {
        source: "/scanner-api/:path*",
        destination: `${scannerUrl}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
