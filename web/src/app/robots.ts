import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/sign-in", "/sign-up"] },
    host: "https://groupys.app",
    sitemap: "https://groupys.app/sitemap.xml",
  };
}
