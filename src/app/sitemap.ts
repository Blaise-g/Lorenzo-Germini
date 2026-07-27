import { MetadataRoute } from "next";
import { RESUME_DATA } from "@/data/resume-data";
import { BUILD_DATE } from "@/lib/build-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: RESUME_DATA.personalWebsiteUrl,
      lastModified: BUILD_DATE,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: new URL("/cv", RESUME_DATA.personalWebsiteUrl).href,
      lastModified: BUILD_DATE,
      changeFrequency: "yearly",
      priority: 0.8,
    },
  ];
}
