import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";

import nextConfig from "@/../next.config";
import { RESUME_DATA } from "@/data/resume-data";
import {
  CANONICAL_ORIGIN,
  PUBLICATION_HOSTS,
  RETIRED_DEPLOYMENT_HOST,
} from "@/lib/site-hosts";

import {
  collectIdentitySurfaces,
  IDENTITY_MANIFESTS,
  ROUTING_MANIFESTS,
} from "./support/identity-surfaces";

/* #76 propagates #68's option B: `lorenzogermini.com` is the one canonical
   host, and the deployment host it replaces still serves. The prior defect is
   #44 — a label changed in one surface and five kept claiming the retired one.
   A host is the same shape of hand-edited duplicate, spread over more files,
   so it gets the same lockstep guard.

   The retired host is written out rather than imported: the literal is the
   anchor here, and reading it from the same constant the redirect rule uses
   would make a typo in that constant invisible to this test. */
const retiredHost = "lorenzo-germini.vercel.app";

/* The tie between the deliberate duplicate above and the constant the redirect
   rule ships, asserted once at module scope so a typo in either fails on its
   own terms rather than as a confusing miss inside some other test. */
test("the retired host literal and the shipped constant agree", () => {
  expect(RETIRED_DEPLOYMENT_HOST).toBe(retiredHost);
});

const auditedPaths = [...IDENTITY_MANIFESTS, ...ROUTING_MANIFESTS];

/** Every host #68 sanctioned a redirect rule for. Nothing else may be gated. */
const redirectableHosts: string[] = [retiredHost, ...PUBLICATION_HOSTS];

test.describe("canonical host lockstep", () => {
  test("no identity surface still points at the retired host", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    const surfaces = await collectIdentitySurfaces(page, request, auditedPaths);

    expect(
      surfaces.filter(({ text }) => text.includes(retiredHost)),
      `no surface should still point at ${retiredHost}`,
    ).toEqual([]);

    /* Guards the assertion above from passing because a surface came back
       empty and silently matched nothing. */
    expect(
      surfaces.filter(({ text }) => text.trim() === ""),
      "every identity surface should have content to audit",
    ).toEqual([]);
  });

  /* The manifests are hand-written prose, so their site links are a second copy
     of `personalWebsiteUrl` that nothing regenerates. Only hosts that serve
     this site are in scope — Substack, LinkedIn and a project's own
     `ghigliottina.vercel.app` are elsewhere by design and stay out of it. */
  const siteHosts = [
    new URL(CANONICAL_ORIGIN).host,
    retiredHost,
    ...PUBLICATION_HOSTS,
  ];

  for (const manifest of IDENTITY_MANIFESTS) {
    test(`${manifest} reaches this site only on the canonical origin`, async ({
      request,
    }) => {
      const text = await (await request.get(manifest)).text();
      const ownLinks = [...text.matchAll(/https:\/\/[^\s)]+/g)]
        .map(([url]) => url)
        .filter((url) => siteHosts.includes(new URL(url).host));

      expect(
        ownLinks.length,
        `${manifest} should link to this site at all`,
      ).toBeGreaterThan(0);
      expect(
        ownLinks.filter((url) => !url.startsWith(CANONICAL_ORIGIN)),
        `${manifest} should reach this site only through ${CANONICAL_ORIGIN}`,
      ).toEqual([]);
    });
  }

  /* #105(2) added the manifest pointer: `/llms.txt` was linked only from the
     footer colophon, so a crawler that reads robots first had no way to find
     it. `robots.txt` has no directive for that, hence a comment — which makes
     its absolute URL one more hand-written copy of the origin, and so part of
     this lockstep rather than a discoverability check of its own. */
  test("robots.txt advertises the sitemap and the manifest on the canonical origin", async ({
    request,
  }) => {
    const robots = await (await request.get("/robots.txt")).text();

    expect(robots).toContain(`Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`);
    expect(
      robots,
      "robots.txt should name /llms.txt so crawlers can discover it",
    ).toContain(`${CANONICAL_ORIGIN}/llms.txt`);
  });

  test("every sitemap entry is on the canonical origin", async ({
    request,
  }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      ([, url]) => url,
    );

    expect(locations.length, "the sitemap should list routes").toBeGreaterThan(
      0,
    );
    expect(
      locations.filter((url) => new URL(url).origin !== CANONICAL_ORIGIN),
      "the sitemap is the crawler's route list and must not name a retired host",
    ).toEqual([]);
  });

  /* #76(c): `/` was the only route whose metadata set no canonical. The retired
     host 308s here rather than disappearing, so without one the redirect source
     stays indexable as a duplicate. (`/cv` and `/writing` already set theirs;
     only `/cv`'s is asserted, in `tests/cv-route.spec.ts`.)

     Byte equality with the sitemap's homepage entry, not just the same origin:
     `personalWebsiteUrl` is a bare origin, Next normalises it again on the way
     into `<link rel="canonical">`, and the manifests restate it by hand. Three
     spellings of one URL is exactly the drift #76 exists to end. */
  test("the homepage canonical and its sitemap entry are the same string", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute("href");

    expect(canonical).toBe(CANONICAL_ORIGIN);
    expect(RESUME_DATA.personalWebsiteUrl).toBe(canonical);

    const sitemap = await (await request.get("/sitemap.xml")).text();
    const homepageEntry = sitemap.match(/<loc>([^<]+)<\/loc>/)?.[1];
    expect(homepageEntry).toBe(canonical);
  });
});

/* The rules match on the `Host` header, so the shipped behaviour is reachable
   without a deploy: send the header a browser would never let you set and the
   real rule runs against the real server. That is what these assert — status
   line and `location`, the same evidence #76's definition of done asks `curl`
   for in production.

   The polarity is the part that matters most: #68 chose 307 for the publication
   hosts precisely because a 308 cached in the wild would outlive the later flip
   to a Substack custom domain, and that distinction is one boolean deep. */
test.describe("retired-host redirects", () => {
  /** No redirect following: `location` is the assertion, and it points off-box. */
  async function head(request: APIRequestContext, host: string, path: string) {
    const response = await request.get(path, {
      headers: { host },
      maxRedirects: 0,
    });
    return { status: response.status(), location: response.headers().location };
  }

  for (const host of ["germinai.xyz", "www.germinai.xyz"]) {
    test(`${host} sends every path to the essay index, temporarily`, async ({
      request,
    }) => {
      /* Every path, not just `/`: the publication host is a doorway to the
         writing, not a mirror of the site, so `/cv` lands there too. */
      for (const path of ["/", "/cv", "/writing", "/deep/unknown"]) {
        expect(await head(request, host, path), `${host}${path}`).toEqual({
          status: 307,
          location: `${CANONICAL_ORIGIN}/writing`,
        });
      }
    });
  }

  test(`${retiredHost} keeps its paths, permanently`, async ({ request }) => {
    for (const [path, destination] of [
      ["/", CANONICAL_ORIGIN],
      ["/cv", `${CANONICAL_ORIGIN}/cv`],
      ["/writing", `${CANONICAL_ORIGIN}/writing`],
    ]) {
      expect(
        await head(request, retiredHost, path),
        `links already in the wild should survive: ${path}`,
      ).toEqual({ status: 308, location: destination });
    }
  });

  /* The complement of the two tests above: they prove the sanctioned hosts do
     redirect, this proves nobody else does. A preview deployment or the local
     dev server picking up a rule would take the suite off-site. */
  test("no other host is redirected", async ({ request }) => {
    for (const host of [
      new URL(CANONICAL_ORIGIN).host,
      "localhost:3200",
      "lorenzo-germini-git-some-branch.vercel.app",
      "evil-germinai.xyz",
      "germinai.xyz.example.com",
    ]) {
      const { status } = await head(request, host, "/");
      expect(status, `${host} should be served, not redirected`).toBe(200);
    }
  });

  async function redirectRules() {
    const redirects = nextConfig.redirects;
    expect(redirects, "next.config should declare redirects").toBeTruthy();
    return await redirects!();
  }

  /* Sampling hosts can only ever prove the ones sampled. Reading the rule set
     itself is what makes "nothing else redirects" exhaustive.

     These two also cover a staleness hole in the HTTP tests above: the dev
     server restarts when `next.config.ts` changes but not when the imported
     `site-hosts.ts` does, so against a long-running local server an edit to the
     host constants can leave the HTTP tests asserting against rules the server
     compiled minutes ago. This spec reads the config in-process, so it is
     always looking at the current source. */
  test("every rule is gated on an exact production host", async () => {
    const rules = await redirectRules();

    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      /* An ungated rule would fire on localhost and on every preview
         deployment, redirecting the suite and the previews off-site. */
      expect(
        rule.has,
        `${rule.source} -> ${rule.destination} should be gated on exactly one host`,
      ).toHaveLength(1);
      expect(rule.has![0].type).toBe("host");
      /* Membership, not a shape: a pattern loose enough to describe a hostname
         also matches `localhost` and every `*.vercel.app` preview, which is the
         failure this test exists to catch. */
      expect(
        redirectableHosts,
        `${rule.has![0].value} is not a host #68 sanctioned a redirect for`,
      ).toContain(rule.has![0].value);
      expect(rule.destination.startsWith(CANONICAL_ORIGIN)).toBe(true);
    }
  });

  /* #68 named both publication hosts. A rule set that silently stopped
     covering the `www.` one would still pass every test above that samples it
     — this is what notices the rule is gone rather than the sample. */
  test("both publication hosts and the retired host have a rule", async () => {
    const rules = await redirectRules();
    const gatedHosts = rules.flatMap((rule) =>
      (rule.has ?? []).map((condition) => condition.value),
    );

    expect(gatedHosts.sort()).toEqual(
      ["germinai.xyz", "www.germinai.xyz", retiredHost].sort(),
    );
  });
});
