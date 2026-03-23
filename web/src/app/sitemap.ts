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
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog/album-rating`,
      lastModified: new Date("2026-03-23"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog/music-connection`,
      lastModified: new Date("2026-03-23"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog/music-and-dating`,
      lastModified: new Date("2026-03-23"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date("2026-03-20"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
