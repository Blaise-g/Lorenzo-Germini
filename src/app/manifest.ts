import { MetadataRoute } from "next";
import { RESUME_DATA } from "@/data/resume-data";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${RESUME_DATA.name} - AI Engineer Portfolio`,
    short_name: RESUME_DATA.name,
    description: RESUME_DATA.summary,
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f7",
    theme_color: "#5b52a8",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
