import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${siteUrl}/`, lastModified, priority: 1, changeFrequency: "weekly" },
    { url: `${siteUrl}/pricing`, lastModified, priority: 0.9, changeFrequency: "monthly" },
    { url: `${siteUrl}/sign-up`, lastModified, priority: 0.6, changeFrequency: "monthly" },
    { url: `${siteUrl}/sign-in`, lastModified, priority: 0.4, changeFrequency: "monthly" },
  ];
}
