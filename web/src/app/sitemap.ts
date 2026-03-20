import type { MetadataRoute } from "next";

const BASE_URL = "https://groupys.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date("2026-03-20"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
