/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone is for Docker only — breaks Vercel deployments
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
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
};

export default nextConfig;
