# Substack Integration Options for the Lorenzo Germini Site

Research date: 2026-07-23. Scope: how to integrate a Substack publication into this
Next.js 16 / App Router / Vercel resume-portfolio site. Claims are cited inline with
source URLs. Where a fact was verified empirically against a live feed, it is marked
**[verified live]**.

## Project context (verified against local files)

- **Next.js `^16`, React `^19`**, App Router, Turbopack — `package.json`.
- **Bun** is the package manager / runtime per `CLAUDE.md`; scripts use plain `next` (`package.json`).
- **Tailwind v4** via `@theme` in `src/app/globals.css` (verified: `@theme {` at line 7), shadcn/ui in `src/components/ui/`.
- Single-page site: `src/app/page.tsx`; resume data in `src/data/resume-data.tsx`.
- Deployed on **Vercel** (serverless) with Vercel Analytics + Speed Insights.
- **`next.config.ts` does NOT currently enable `cacheComponents`.** Current config only sets `images.remotePatterns` (github avatars). To use `use cache` / `cacheLife` / `cacheTag`, the flag must be turned on — this is a prerequisite decision, not a given. Source: local `next.config.ts`; `.next-docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.mdx`.
- There is **no Substack URL** in `resume-data.tsx` yet (only GitHub/LinkedIn/Twitter and project links) — an integration would add new data.
- `next/image` `remotePatterns` currently allows only `avatars.githubusercontent.com`; rendering Substack images requires adding `substackcdn.com` (and/or `substack-post-media.s3.amazonaws.com`) as allowed hosts. Source: local `next.config.ts`.

---

## 1. Substack RSS feed

### Feed URL format
- Default: `https://<publication>.substack.com/feed`. If the publication uses a custom
  domain, the feed lives at `https://<custom-domain>/feed` and the subdomain form
  redirects there. **[verified live]** `https://noahpinion.substack.com/feed` serves an
  RSS 2.0 document whose item `<link>`/`<guid>` point at the custom domain
  `https://www.noahpinion.blog/p/...`.
- Overview of the working URL variants: [wpRSSaggregator – Substack RSS Feed](https://www.wprssaggregator.com/substack-rss-feed/).

### XML shape **[verified live, noahpinion.substack.com/feed, 2026-07-22]**
Root: `<rss version="2.0">` with namespaces `content` (`content:encoded`), `dc`, `atom`,
`itunes`, `googleplay`.

- **Channel level:** `title`, `description`, `link`, `image>url`, `generator`,
  `lastBuildDate`, `atom:link` (self), `copyright`, `language`, `webMaster`, plus
  `itunes:*` / `googleplay:*` podcast owner tags (Substack always emits podcast tags even
  for text publications).
- **Item level:** `title`, `link`, `guid` (`isPermaLink="false"`, value is the post URL),
  `pubDate` (RFC-822, e.g. `Wed, 22 Jul 2026 07:34:05 GMT`), `dc:creator`, `description`,
  `content:encoded`, and `enclosure`.

### Full text vs excerpt
- **`description`** = short subtitle/teaser (53 characters in the sampled item). **[verified live]**
- **`content:encoded`** = the full post body as HTML (36,864 characters in the sampled
  free item), wrapped in `<![CDATA[...]]>`. **[verified live]** This is the RSS
  `content:encoded` module — a common but non-universally-supported extension.
  ([RSS-Bridge Substack notes](https://rss-bridge.github.io/rss-bridge/Bridge_Specific/Substack.html))
- **Free posts ship full text; paid/subscriber-only posts ship only the public preview**
  (a couple of paragraphs) capped with a subscribe prompt — the same teaser a logged-out
  visitor sees. Full paywalled text is only retrievable with an authenticated
  `substack.sid` session cookie. Sources:
  [RSS-Bridge](https://rss-bridge.github.io/rss-bridge/Bridge_Specific/Substack.html),
  [FreshRSS discussion #6667](https://github.com/FreshRSS/FreshRSS/discussions/6667).
- Truncated (paywalled) items are typically appended with a **"Read more"** link and the
  body contains a `paywall-title` div reading "This post is for paid subscribers"; there is
  no explicit `paid` flag/class. ([FreshRSS #6667](https://github.com/FreshRSS/FreshRSS/discussions/6667))

### Images
- Each item carries an `<enclosure>` pointing at the post's cover image on the Substack
  CDN, e.g. `url="https://substackcdn.com/image/fetch/.../https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2F...jpeg" length="0" type="image/jpeg"`. **[verified live]**
- Inline images appear inside `content:encoded` as `<figure><picture><img ...></picture><figcaption>…</figcaption></figure>` markup (the sampled item's HTML contained `figure`, `picture`, `img`, `figcaption` tags). **[verified live]** For latest-article *cards* the `enclosure` URL is the clean choice for the thumbnail; parsing `content:encoded` for the first `<img>` is a fallback.

### Item count, update cadence, rate limits
- **Item count is small and not officially documented.** Sampled feeds returned only a
  handful of items: **6 items** (noahpinion) and **5 items** (astralcodexten) **[verified live]**.
  Commonly cited elsewhere is "up to ~20"; treat the feed as "the most recent N posts,"
  not a full archive. Third-party full-text converters impose their own separate caps
  (e.g. fulltextrssfeed ~7-8) unrelated to Substack.
  ([wpRSSaggregator](https://www.wprssaggregator.com/substack-rss-feed/))
- **Update cadence:** `lastBuildDate` updates when new posts publish; the feed is
  regenerated/edge-cached by Substack. There is **no publicly documented rate limit** for
  the native feed, but it is CDN-served and should not be polled aggressively; caching on
  our side (Section 2) is the right posture.
- **CORS:** direct browser `fetch()` of the feed hits CORS restrictions — it must be
  fetched **server-side** (which is what our Next.js pattern below does anyway).
  ([Custom Substack front-end write-up](https://matthagy.substack.com/p/developing-a-custom-substack-front))

---

## 2. Building latest-article cards from RSS in Next.js 16

### Fetching + parsing
- Use the runtime's native `fetch` (Bun and Node both provide it) plus a small XML parser.
  `fast-xml-parser` is a good zero-native-dep choice; `rss-parser` also works but is
  heavier. Install with `bun add fast-xml-parser`. (No parser is bundled today — verified
  against `package.json`.)
- Fetch **on the server** (Server Component or a cached function), never the client, to
  avoid the CORS issue noted above and to keep the API key-free request off the browser.

### Correct Next.js 16 caching approach (Cache Components era)
This site is in the `cacheComponents` era, where **data fetches are excluded from the
prerender unless explicitly cached** — you opt back into caching with the `use cache`
directive. Source: `.next-docs/.../cacheComponents.mdx`.

Key facts from the local docs (`.next-docs/.../directives/use-cache.mdx`,
`.next-docs/.../functions/cacheLife.mdx`, `.next-docs/.../functions/cacheTag.mdx`):

- `use cache` marks a file/component/function cacheable; enabling it **requires
  `cacheComponents: true` in `next.config.ts`** (currently OFF).
- **`cacheLife` preset profiles** (stale / revalidate / expire):
  `default` = 5min / 15min / 1yr; `hours` = 5min / 1hr / 1day; `days` = 5min / 1day / 1wk;
  `weeks` = 5min / 1wk / 30days. `revalidate` is the background-refresh interval (ISR-like:
  serve stale, refresh in background). Newsletters map naturally to `days` or `weeks`.
- **`cacheTag('...')` + `revalidateTag('...')`** enable on-demand invalidation (e.g. from a
  route handler you could hit manually or from a scheduled job when you publish). Tag limit:
  256 chars, max 128 tags.
- **Serverless caveat (Vercel):** with `use cache`, runtime in-memory cache entries
  "typically don't persist across requests" on serverless — but **time-based revalidation
  is implemented via the ISR/data cache**, so a `cacheLife('days')` fetch behaves like ISR
  and does persist/refresh in the background on Vercel. For our read-only public feed this
  is exactly what we want; `use cache: remote` (Redis/KV) is unnecessary.
- Cached functions **cannot** read `cookies()`/`headers()`/`searchParams`; our feed fetch
  needs none of these, so it is a clean fit.
- Server→client: `stale` drives the client router cache with an enforced **30s minimum**.

### Recommended pattern (code sketch)

```ts
// src/lib/substack.ts
import { cacheLife, cacheTag } from "next/cache";
import { XMLParser } from "fast-xml-parser";

export type Article = {
  title: string;
  url: string;
  publishedAt: string;
  excerpt: string;
  image?: string;
};

const FEED_URL = "https://<publication>.substack.com/feed";

export async function getLatestArticles(limit = 3): Promise<Article[]> {
  "use cache";
  cacheLife("days");        // newsletter cadence; serve stale, refresh in bg (~daily)
  cacheTag("substack-feed"); // allows on-demand revalidateTag("substack-feed")

  const res = await fetch(FEED_URL);
  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false, cdataPropName: "__cdata" });
  const doc = parser.parse(xml);
  const items = doc.rss.channel.item ?? [];

  return (Array.isArray(items) ? items : [items]).slice(0, limit).map((it: any) => ({
    title: it.title?.__cdata ?? it.title,
    url: it.link,
    publishedAt: it.pubDate,
    excerpt: it.description?.__cdata ?? it.description ?? "",
    image: it.enclosure?.["@_url"],
  }));
}
```

```tsx
// used in a Server Component (e.g. a <LatestWriting/> section imported by page.tsx)
export async function LatestWriting() {
  const articles = await getLatestArticles(3);
  return (
    <ul>
      {articles.map((a) => (
        <li key={a.url}>
          <a href={a.url}>{a.title}</a>
        </li>
      ))}
    </ul>
  );
}
```

- **Server vs client:** keep `getLatestArticles` and the rendering component as **Server
  Components** (no `"use client"`). The current `page.tsx` is a Server Component, so a
  `<LatestWriting/>` section drops in without turning anything into a client component.
  Interactive bits (a subscribe form) can stay isolated client leaves.
- If you'd rather avoid `cacheComponents` for now, the fallback is `fetch(FEED_URL,
  { next: { revalidate: 86400, tags: ["substack-feed"] } })` (route-segment revalidation),
  which does not need the flag — but the project's stated direction is the `use cache`
  model. Source: `.next-docs/.../getting-started/09-caching-and-revalidating.mdx`.

Docs consulted (local): `use-cache.mdx`, `cacheLife.mdx`, `cacheTag.mdx`,
`cacheComponents.mdx`, `07-fetching-data.mdx`, `09-caching-and-revalidating.mdx`,
`revalidatePath.mdx`.

---

## 3. Subscription form — three options

### (a) Substack embed iframe
- Markup from publication Settings → Growth features → "Embed signup form on other
  websites": `<iframe src="https://<pub>.substack.com/embed" width="480" height="320"
  style="border:1px solid #EEE; background:white;" frameborder="0" scrolling="no">`.
  ([Substack support: Can I embed a signup form?](https://support.substack.com/hc/en-us/articles/360041759232-Can-I-embed-a-signup-form-for-my-Substack-publication))
- **Sizing:** default `width="480"` is hardcoded and overflows on phones; the standard fix
  is to set `width:100%`. A pub-logo toggle exists; otherwise **not customizable** —
  Substack states the embed form "is not customizable."
  ([Substack support](https://support.substack.com/hc/en-us/articles/360041759232-Can-I-embed-a-signup-form-for-my-Substack-publication),
  [Supascribe guide](https://supascribe.com/guides/substack-subscribe-form-embed))
- **Styling limits:** cannot match Tailwind theme (fonts, dark mode, accent colors) — it is
  a white box with Substack's own styling; fixed success message; no custom redirect; no
  conversion analytics (cross-origin, GA can't see inside).
  ([Supascribe](https://supascribe.com/guides/substack-subscribe-form-embed))
- **Privacy cost:** a third-party cross-origin iframe from `substack.com` = third-party
  cookies and an external request on page load — at odds with the site's otherwise
  first-party, minimal-tracking footprint.

### (b) Custom form POSTing to Substack
- Undocumented endpoint used by Substack's own form: `POST
  https://<pub>.substack.com/api/v1/free?nojs=true`, body
  `email=<addr>&source=subscribe_page` (`application/x-www-form-urlencoded`).
  ([laserfocus – Automate adding subscribers](https://laserfocus.substack.com/p/automate-adding-substack-subscribers),
  [techtrails – Adding subscribers to Substack](https://techtrails.io/p/adding-subscribers-to-substack))
- **Cross-origin from the browser fails** (CORS; Substack also strips `referer`/`origin`).
  It works only **server-to-server** via a proxy (e.g. a Next.js route handler / Server
  Action forwarding the request).
  ([techtrails](https://techtrails.io/p/adding-subscribers-to-substack))
- **Caveats:** undocumented and unofficial — behavior can change without notice and use
  **may violate Substack's ToS**; Substack has no official public API.
  ([techtrails](https://techtrails.io/p/adding-subscribers-to-substack),
  [matthagy](https://matthagy.substack.com/p/developing-a-custom-substack-front))
  Gives full styling control and first-party UX but is the least reliable and the riskiest.

### (c) Plain link to the subscribe page
- A styled link/button to `https://<pub>.substack.com/subscribe` (or the publication home).
  Zero third-party code on our page, full control over the button's look, most reliable
  (nothing to break), but adds a navigation hop off-site.

### Comparison
| Option | Aesthetics | Privacy | Control | Reliability |
| --- | --- | --- | --- | --- |
| (a) iframe embed | Poor (fixed white box) | Poor (3rd-party cookies) | Low | High |
| (b) custom form → API | Excellent (native) | Good (first-party proxy) | High | Low (undocumented, ToS risk) |
| (c) plain link | Good (our button) | Excellent (no 3rd-party) | High (styling only) | Highest |

---

## 4. Linking to the full archive

- **Archive:** `https://<pub>.substack.com/archive` — full chronological post list.
  ([Substack FAQ – Archive](https://faq.substack.com/archive))
- **Per-post:** `https://<pub>.substack.com/p/<post-slug>` (custom domains substitute the
  domain). **[verified live]** guid/link = `https://www.noahpinion.blog/p/...`.
  ([JoeBao22/substack-archiver](https://github.com/JoeBao22/substack-archiver))
- **Section (per-publication category):** `https://<pub>.substack.com/s/<section-slug>`
  (slug editable in settings).
  ([Substack Sections Explained](https://pubstacksuccess.substack.com/p/substack-sections-explained))
- **Platform-level topic category (Discover, not per-pub):**
  `https://substack.com/discover/category/<category>/all`.
  ([Medium – scraping Substack metadata](https://medium.com/@hungcheungchan/scraping-substack-metadata-using-undocumented-unofficial-api-aee82786b507))

---

## 5. Local `/writing` route vs homepage-only cards

Framing from the project's goal: the site is the **central professional hub** and essays
are a **first-class identity signal**, explicitly **not** a newsletter landing page.

### Homepage-only cards (a `<LatestWriting/>` section on `page.tsx`)
- **Pros:** minimal surface; single page stays the canonical entry; low maintenance; the
  latest 2-3 posts reinforce "this person writes" without stealing focus from the resume.
- **Cons:** no first-party landing surface for essays; SEO value accrues to Substack, not
  your domain; nowhere to host local MDX essays later; content is only ever a link-out.

### RSS-driven `/writing` index route
- **Pros:** a first-party URL (`lorenzo-germini.vercel.app/writing`) that *you* own and can
  rank/link in the resume and JSON-LD; natural home for future **local MDX essays** as
  first-class content (mix Substack link-outs + owned long-form); better narrative control
  of ordering, tags, framing; the homepage can still show 2-3 cards that link into
  `/writing`.
- **Cons:** more surface to build and maintain (route, list, empty/error states, image
  host allow-listing); if it only ever mirrors Substack, the canonical/SEO story overlaps
  with Substack (mitigate by treating Substack items as summaries/links, not full
  reposts — avoid duplicate-content; owned MDX is where SEO value concentrates).
- **Content ownership:** the `/writing` route is the only option that lets essays live on
  your domain long-term; Substack can change, paywall, or disappear — an owned index +
  optional local MDX is the durable identity artifact.

---

## Recommendation matrix

| Area | Options | Pros / Cons | Recommended default (input to a human decision) |
| --- | --- | --- | --- |
| **1. Feed source** | Native `<pub>.substack.com/feed` (RSS 2.0, `content:encoded` full text for free posts, `description` excerpt, `enclosure` image); paid posts truncated | +Official, no auth, cover image via enclosure / −small item count (~5-6 observed, undocumented), −paid posts preview-only, −browser CORS | **Use the native feed, server-side only**, read `enclosure` for thumbnails and `description` for card excerpts |
| **2. Fetch + cache** | (a) `use cache` + `cacheLife('days')` + `cacheTag` (needs `cacheComponents:true`); (b) `fetch(..., {next:{revalidate,tags}})` | (a) +aligns with project's Cache Components direction, ISR-like on Vercel / −requires enabling the flag; (b) +works today without the flag / −not the stated model | **(a) `use cache` + `cacheLife('days')` + `cacheTag('substack-feed')`** in a server `lib/substack.ts`, rendered by a Server Component — *contingent on enabling `cacheComponents`*; use (b) if the flag stays off |
| **3. Subscribe UI** | (a) iframe embed; (b) custom form → undocumented API; (c) plain styled link | (a) +reliable/−ugly, 3rd-party cookies; (b) +native look/−ToS + CORS + fragile; (c) +reliable, first-party, on-brand/−off-site hop | **(c) plain styled link/button** to `/subscribe`, matching Tailwind theme — best privacy + reliability, no third-party cookies; revisit (b) via a server proxy only if inline capture becomes a real requirement |
| **4. Archive linking** | `/archive`, `/p/<slug>`, `/s/<section>`, Discover `/discover/category` | Stable, documented URL shapes | Link cards to per-post `/p/<slug>` (from feed `link`), and a single "Read all essays" link to `/archive` |
| **5. Surface** | Homepage cards only vs `/writing` index (RSS + optional local MDX) | cards: +low maint/−no owned surface; route: +owned SEO + MDX home/−more to build | **`/writing` index route** (RSS-driven now, MDX-ready later) with **2-3 latest cards on the homepage linking into it** — matches "central hub, essays as first-class identity" |

### Prerequisites flagged for the human decision
- Enabling **`cacheComponents: true`** in `next.config.ts` is a project-wide change (it
  unifies `ppr`/`useCache`/`dynamicIO`); decide this before adopting the `use cache` pattern.
- Add **`substackcdn.com`** (and possibly `substack-post-media.s3.amazonaws.com`) to
  `next.config.ts` `images.remotePatterns` if rendering feed images via `next/image`.
- Add the Substack publication URL to `src/data/resume-data.tsx` (none present today).
