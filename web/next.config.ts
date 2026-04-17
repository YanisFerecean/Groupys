import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const analyze = process.env.ANALYZE === "true";

const baseConfig: NextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.groupys.app" }],
        destination: "https://groupys.app/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    // Responsive image sizes for different device widths
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for layout patterns
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache optimized images for 1 day
    minimumCacheTTL: 86400,
    // Image formats for better compression
    formats: ["image/webp", "image/avif"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "groupys.app",
      },
      {
        protocol: "https",
        hostname: "cdn-images.dzcdn.net",
      },
      {
        protocol: "https",
        hostname: "e-cdns-images.dzcdn.net",
      },
      {
        protocol: "https",
        hostname: "i.scdn.co",
      },
      {
        protocol: "https",
        hostname: "*.mzstatic.com",
      },
      {
        protocol: "https",
        hostname: "lastfm.freetls.fastly.net",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
};

// Wrap with bundle analyzer if ANALYZE is true
const nextConfig = analyze
  ? withBundleAnalyzer({
      enabled: analyze,
      openAnalyzer: false,
    })(baseConfig)
  : baseConfig;

export default nextConfig;
