import type { NextConfig } from "next";

import { SUBSTACK_IMAGE_HOSTS } from "./src/lib/substack-image-hosts";

const nextConfig: NextConfig = {
  cacheComponents: true,
  /* Spec §2.5 part 2: the profile a failed, empty or malformed feed read gets,
     so a cached "there is no writing" expires in minutes rather than inheriting
     a successful feed's hourly or daily lifetime. */
  cacheLife: {
    feedMiss: {
      stale: 60,
      revalidate: 300,
      expire: 900,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
      /* Substack cover art. `<enclosure>` reports `length="0"` and carries no
         intrinsic dimensions, so the index renders every cover with `fill` and
         a fixed aspect ratio. The feed parser drops a cover from any host not
         listed here — `next/image` throws on an unconfigured one. */
      ...SUBSTACK_IMAGE_HOSTS.map((hostname) => ({
        protocol: "https" as const,
        hostname,
        pathname: "/**",
      })),
    ],
  },
};

export default nextConfig;
