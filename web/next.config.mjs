/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
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
