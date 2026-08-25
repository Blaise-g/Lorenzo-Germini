import type { NextConfig } from "next";

import {
  CANONICAL_ORIGIN,
  PUBLICATION_HOSTS,
  RETIRED_DEPLOYMENT_HOST,
} from "./src/lib/site-hosts";
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
  /* #68 option B: `lorenzogermini.com` is the one canonical host and the other
     three fold into it. Every rule is `has`-gated on an exact production host,
     so preview deployments — and localhost, which matches no rule — are
     untouched and the Playwright suite never sees a redirect. */
  async redirects() {
    return [
      /* The publication's vanity host is a doorway to the essay index, not a
         mirror of the site: every path lands on `/writing`. Deliberately 307
         and not 308 — #68 keeps the flip to a Substack custom domain open, and
         a permanent redirect cached in the wild would outlive the decision. */
      ...PUBLICATION_HOSTS.map((host) => ({
        source: "/:path*",
        has: [{ type: "host" as const, value: host }],
        destination: `${CANONICAL_ORIGIN}/writing`,
        permanent: false,
      })),
      /* The retired deployment host keeps its paths, so links already in the
         wild survive the move. Permanent: this one is never coming back. */
      {
        source: "/:path*",
        has: [{ type: "host" as const, value: RETIRED_DEPLOYMENT_HOST }],
        destination: `${CANONICAL_ORIGIN}/:path*`,
        permanent: true,
      },
    ];
  },
  /* #104: the CV PDF duplicates `/cv`, is crawlable, and Google indexes PDFs,
     so a canonical `Link` folds its ranking signals onto the HTML page while
     leaving the file findable for anyone searching for it directly — chosen
     over `noindex` in #99. Unconditional, unlike the host-gated redirects
     above: the origin it names is the canonical one every production host folds
     into anyway, so the header is correct on all of them, and a `has`-gate
     would only make the rule untestable locally. */
  async headers() {
    return [
      /* GH-118 probe: can `Vary: Accept` reach the client at all, given the
         middleware-appended one is stripped by the CDN? Throwaway. */
      {
        source: "/:path(cv|writing)",
        headers: [{ key: "Vary", value: "Accept" }],
      },
      {
        source: "/lorenzo-germini-cv.pdf",
        headers: [
          {
            key: "Link",
            value: `<${CANONICAL_ORIGIN}/cv>; rel="canonical"`,
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
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
