/* Issue #24 — the feed parser, exercised without a browser or a server.
   `src/lib/substack-feed.ts` is deliberately free of `next/*` imports so these
   can be written as ordinary assertions: every failure mode the acceptance
   criteria name ("unreachable, empty, or malformed results omit the Writing
   surface") passes through this module, and the browser specs can then assume
   parsing works and measure the page instead. */

import { expect, test } from "@playwright/test";

import { parseSubstackFeed, readingMinutes } from "../src/lib/substack-feed";

const BASE = "https://lorenzogermini.substack.com";

function words(count: number) {
  return Array.from({ length: count }, () => "word").join(" ");
}

function feed(items: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel><title>germinai</title>${items}</channel>
</rss>`;
}

function item({
  title = "An essay",
  link = `${BASE}/p/an-essay`,
  pubDate = "Tue, 21 Jul 2026 07:30:00 GMT",
  enclosure = `<enclosure url="https://substackcdn.com/image/fetch/cover.png" length="0" type="image/png"/>`,
  body = `<p>The opening paragraph.</p><p>${words(400)}</p>`,
  description = "<p>Feed description.</p>",
} = {}) {
  return `<item>
    <title><![CDATA[${title}]]></title>
    <link>${link}</link>
    <pubDate>${pubDate}</pubDate>
    ${enclosure}
    <description><![CDATA[${description}]]></description>
    ${body === "" ? "" : `<content:encoded><![CDATA[${body}]]></content:encoded>`}
  </item>`;
}

test.describe("parsing a well-formed feed", () => {
  test("reads the fields the index renders and nothing it does not", () => {
    const [essay] = parseSubstackFeed(feed(item()));

    expect(essay).toEqual({
      title: "An essay",
      url: `${BASE}/p/an-essay`,
      publishedAt: "2026-07-21T07:30:00.000Z",
      coverUrl: "https://substackcdn.com/image/fetch/cover.png",
      excerpt: "The opening paragraph.",
      readingMinutes: 2,
    });
  });

  test("orders newest first even when the feed does not", () => {
    const essays = parseSubstackFeed(
      feed(
        item({
          title: "Older",
          link: `${BASE}/p/older`,
          pubDate: "Tue, 28 Apr 2026 07:30:00 GMT",
        }) +
          item({
            title: "Newer",
            link: `${BASE}/p/newer`,
            pubDate: "Tue, 21 Jul 2026 07:30:00 GMT",
          }),
      ),
    );

    expect(essays.map((essay) => essay.title)).toEqual(["Newer", "Older"]);
  });

  test("falls back to the description when there is no body", () => {
    const [essay] = parseSubstackFeed(
      feed(item({ body: "", description: "<p>Only a description.</p>" })),
    );

    expect(essay.excerpt).toBe("Only a description.");
    /* No body, so no computed reading time — and no invented label for it. */
    expect(essay.readingMinutes).toBeNull();
  });
});

test.describe("resilience", () => {
  for (const [name, input] of [
    ["an empty channel", feed("")],
    ["an empty string", ""],
    ["a Cloudflare interstitial", "<html><body>Just a moment…</body></html>"],
    ["truncated XML", `<?xml version="1.0"?><rss><channel><item><title>`],
    ["JSON", '{"items":[]}'],
  ] as const) {
    test(`${name} yields no essays rather than throwing`, () => {
      expect(parseSubstackFeed(input)).toEqual([]);
    });
  }

  test("an item missing a link, a title or a usable date is skipped", () => {
    const essays = parseSubstackFeed(
      feed(
        item({ link: "" }) +
          item({ title: "", link: `${BASE}/p/untitled` }) +
          item({ link: `${BASE}/p/undated`, pubDate: "soon" }) +
          item({ title: "Kept", link: `${BASE}/p/kept` }),
      ),
    );

    expect(essays.map((essay) => essay.title)).toEqual(["Kept"]);
  });

  test("a cover on an unexpected host is dropped, not rendered", () => {
    /* `next/image` throws on a host missing from `remotePatterns`, so an
       unrecognised `<enclosure>` would take the whole index down rather than
       showing a broken thumbnail. */
    const [essay] = parseSubstackFeed(
      feed(
        item({
          enclosure: `<enclosure url="https://evil.example.com/tracker.gif" length="0" type="image/gif"/>`,
        }),
      ),
    );

    expect(essay.coverUrl).toBeNull();
  });

  test("de-duplicates entries that differ only by query string", () => {
    /* The publication has additional post languages enabled and how Substack
       represents that in RSS is unverified. If it doubles an entry, the count
       must not double with it — the rendering thresholds are keyed to it. */
    const essays = parseSubstackFeed(
      feed(
        item({ title: "Essay", link: `${BASE}/p/essay` }) +
          item({ title: "Essay (it)", link: `${BASE}/p/essay?lang=it` }),
      ),
    );

    expect(essays).toHaveLength(1);
    expect(essays[0].title).toBe("Essay");
  });
});

test.describe("reading time (decision 7: a threshold, not a paywall detector)", () => {
  test("is omitted below the 250-word floor and computed above it", () => {
    expect(readingMinutes(`<p>${words(249)}</p>`)).toBeNull();
    expect(readingMinutes(`<p>${words(250)}</p>`)).toBe(1);
    expect(readingMinutes(`<p>${words(2480)}</p>`)).toBe(11);
  });

  test("is omitted, not zero, when there is no body at all", () => {
    expect(readingMinutes(null)).toBeNull();
    expect(readingMinutes("")).toBeNull();
  });

  test("counts words, not markup", () => {
    const markup = `<div class="paragraph long attributes here"><p>${words(300)}</p></div>`;
    expect(readingMinutes(markup)).toBe(readingMinutes(`<p>${words(300)}</p>`));
  });
});
