import { MetadataRoute } from "next";
import { RESUME_DATA } from "@/data/resume-data";
import { WARM_PRINT } from "@/lib/warm-print";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${RESUME_DATA.name} — ${RESUME_DATA.roleLabel}`,
    short_name: RESUME_DATA.name,
    description: RESUME_DATA.summary,
    start_url: "/",
    display: "standalone",
    background_color: WARM_PRINT.light.ground,
    theme_color: WARM_PRINT.light.accent,
    icons: [
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
