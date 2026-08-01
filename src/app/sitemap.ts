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
    /* `lastModified` is the build date rather than the newest essay's: the
       index revalidates from the feed without redeploying, so a build stamp is
       the only date this file can state truthfully. */
    {
      url: new URL("/writing", RESUME_DATA.personalWebsiteUrl).href,
      lastModified: BUILD_DATE,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
