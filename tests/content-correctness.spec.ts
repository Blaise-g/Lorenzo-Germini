import { expect, test } from "@playwright/test";

import { RESUME_DATA } from "@/data/resume-data";
import { MARKDOWN_MEDIA_TYPE } from "@/lib/markdown-negotiation";

import { contrast } from "./support/color";
import {
  collectIdentitySurfaces,
  IDENTITY_MANIFESTS,
  MARKDOWN_SIBLINGS,
} from "./support/identity-surfaces";
import { setTheme, themes } from "./support/theme";

/* WCAG 2.1 AA for text below 18.66px (the large-text threshold at normal
   weight). Everything muted on this page is smaller than that. */
const minimumContrast = 4.5;

test.describe("outbound link hardening", () => {
  test("new-tab links protect their opener and stay cross-origin", async ({
    page,
  }) => {
    await page.goto("/");

    const links = await page
      .locator('a[target="_blank"]')
      .evaluateAll((anchors) =>
        anchors.map((anchor) => ({
          href: (anchor as HTMLAnchorElement).href,
          isSameOrigin:
            new URL((anchor as HTMLAnchorElement).href).origin ===
            location.origin,
          rel: (anchor.getAttribute("rel") ?? "").split(/\s+/).filter(Boolean),
        })),
      );

    expect(
      links.length,
      "the page should render new-tab links",
    ).toBeGreaterThan(0);
    expect(
      links.filter(({ rel }) => !rel.includes("noopener")),
      'every a[target="_blank"] should carry rel="noopener"',
    ).toEqual([]);
    expect(
      links.filter(({ rel }) => !rel.includes("noreferrer")),
      'every a[target="_blank"] should carry rel="noreferrer"',
    ).toEqual([]);
    expect(
      links.filter(({ isSameOrigin }) => isSameOrigin),
      "internal links should stay in the tab",
    ).toEqual([]);
  });

  /* #19: Substack attributes inbound traffic from the Referer header, and the
     browser default (strict-origin-when-cross-origin) already sends this
     origin. Spec §1.8 therefore requires that the site set no Referrer-Policy
     header at all — a `no-referrer` value here would silently turn Substack
     signups into "direct" traffic. */
  test("the site sets no Referrer-Policy header", async ({ page }) => {
    const response = await page.goto("/");

    expect(response?.headers()["referrer-policy"]).toBeUndefined();
  });
});

test.describe("non-interactive badge affordances", () => {
  for (const theme of themes) {
    test(`${theme} mode badges do not react to hover`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto("/");

      const badges = page.locator('main [data-slot="badge"]');

      /* Auditing the cascade rather than hovering each badge in turn catches
         every variant at once, including ones this page happens not to render. */
      const audit = await badges.evaluateAll((elements) => {
        const isInteractive = (element: Element) =>
          Boolean(
            element.closest("a, button") || element.querySelector("a, button"),
          );
        const staticBadges = elements.filter(
          (element) => !isInteractive(element),
        );

        const hoverRules: { selector: string; style: string }[] = [];
        for (const sheet of Array.from(document.styleSheets)) {
          let rules: CSSRule[];
          try {
            rules = Array.from(sheet.cssRules);
          } catch {
            continue; // cross-origin sheet
          }
          const walk = (list: CSSRule[]) => {
            for (const rule of list) {
              if (rule instanceof CSSGroupingRule)
                walk(Array.from(rule.cssRules));
              if (!(rule instanceof CSSStyleRule)) continue;
              if (!rule.selectorText.includes(":hover")) continue;
              const base = rule.selectorText.replaceAll(":hover", "");
              const matches = staticBadges.some((badge) => {
                try {
                  return badge.matches(base);
                } catch {
                  return false;
                }
              });
              if (matches) {
                hoverRules.push({
                  selector: rule.selectorText,
                  style: rule.style.cssText,
                });
              }
            }
          };
          walk(rules);
        }

        return {
          count: elements.length,
          hoverRules,
          pointerCursors: staticBadges
            .filter((badge) => getComputedStyle(badge).cursor === "pointer")
            .map((badge) => badge.textContent?.trim().slice(0, 40) ?? ""),
          staticCount: staticBadges.length,
        };
      });

      expect(audit.count, "the page should render badges").toBeGreaterThan(0);
      expect(
        audit.staticCount,
        "the page should render non-interactive badges",
      ).toBeGreaterThan(0);
      expect(
        audit.hoverRules,
        "no CSS rule should give a non-interactive badge a hover state",
      ).toEqual([]);
      expect(
        audit.pointerCursors,
        "a non-interactive badge should not show a pointer cursor",
      ).toEqual([]);

      /* One end-to-end hover, in case a hover affordance ever arrives by some
         route the cascade audit cannot see (inline style, script, or JS state). */
      const snapshot = (element: Element) => {
        const style = getComputedStyle(element);
        return [
          style.backgroundColor,
          style.borderColor,
          style.color,
          style.cursor,
          style.opacity,
          style.textDecorationLine,
        ].join(" | ");
      };
      const firstStatic = badges
        .filter({ hasNot: page.locator("a, button") })
        .first();
      const before = await firstStatic.evaluate(snapshot);
      await firstStatic.hover();
      expect(
        await firstStatic.evaluate(snapshot),
        "a non-interactive badge should not restyle on hover",
      ).toBe(before);
    });
  }
});

test.describe("faint metadata legibility", () => {
  for (const theme of themes) {
    test(`${theme} mode faint text meets WCAG AA and the 12px floor`, async ({
      page,
    }) => {
      await setTheme(page, theme);
      /* Wide, because the masthead role label and the rail's metadata only
         render from `lg` and they are the smallest faint elements left — the
         command-menu hint's `kbd` used to be the smallest, and #89 removed the
         palette it belonged to. */
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/");
      await expect(page.getByTestId("masthead-role")).toBeVisible();

      const measurements = await page.evaluate(() => {
        const normalizeColor = (value: string) => {
          const probe = document.createElement("span");
          probe.style.color = value;
          document.body.append(probe);
          const normalized = getComputedStyle(probe).color;
          probe.remove();
          return normalized;
        };

        const faintColor = normalizeColor(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--color-faint",
          ),
        );

        const styles = new Map<Element, CSSStyleDeclaration>();
        const styleOf = (element: Element) => {
          const cached = styles.get(element);
          if (cached) return cached;
          const style = getComputedStyle(element);
          styles.set(element, style);
          return style;
        };

        const backgrounds = new Map<Element, string>();
        const effectiveBackground = (element: Element): string => {
          const cached = backgrounds.get(element);
          if (cached) return cached;
          const own = styleOf(element).backgroundColor;
          const alpha = Number((own.match(/[\d.]+/g) ?? [])[3] ?? "1");
          const resolved =
            alpha > 0
              ? own
              : element.parentElement
                ? effectiveBackground(element.parentElement)
                : styleOf(document.body).backgroundColor;
          backgrounds.set(element, resolved);
          return resolved;
        };

        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
        );
        const faint: {
          background: string;
          color: string;
          fontSize: number;
          label: string;
        }[] = [];

        while (walker.nextNode()) {
          const text = walker.currentNode as Text;
          const parent = text.parentElement;
          if (!parent || !text.textContent?.trim()) continue;
          if (parent.closest("nextjs-portal, script, style")) continue;
          const style = styleOf(parent);
          if (style.color !== faintColor) continue;
          if (!parent.getClientRects().length) continue;

          faint.push({
            background: effectiveBackground(parent),
            color: style.color,
            fontSize: Number.parseFloat(style.fontSize),
            label: text.textContent.trim().slice(0, 40),
          });
        }
        return faint;
      });

      expect(
        measurements.length,
        "the page should render faint text to measure",
      ).toBeGreaterThan(0);

      /* Assert across every size, not just the smallest one found: filtering to
         the minimum would stop covering the smallest element when another
         metadata element is added. */
      const failing = measurements
        .map((measurement) => ({
          ...measurement,
          contrast: Number(
            contrast(measurement.color, measurement.background).toFixed(2),
          ),
        }))
        .filter(({ contrast: ratio }) => ratio < minimumContrast);

      expect(
        failing,
        `faint text should reach ${minimumContrast}:1 against its background`,
      ).toEqual([]);

      const smallest = Math.min(
        ...measurements.map(({ fontSize }) => fontSize),
      );
      expect(
        smallest,
        "faint metadata should not render below the signed size floor",
      ).toBeGreaterThanOrEqual(12);
    });
  }
});

/* #6 point 1 names the identity label's coupled surfaces — JSON-LD, both llms
   manifests, OG/metadata — and requires they move in lockstep. #44 is the prior
   defect: it landed the label in the masthead alone and left five surfaces
   claiming the retired one. The two `llms` manifests are hand edits, so this
   loop is looking for a stale one; the markdown siblings #117 added render the
   fields, so for them it is asserting the generator reads the field this test
   names rather than some neighbouring one. */
test.describe("identity lockstep", () => {
  const retiredRoleLabel = "Full-Stack AI Engineer";
  const manifests = IDENTITY_MANIFESTS;

  /* Agreement with the data module, not a literal: the wording is the owner's
     to rewrite, and this should still hold afterwards. Both `about` and
     `summary` are asserted — #52 found that guarding only `about` let
     `llms-full.txt`'s second paragraph drift for a whole release, because the
     manifests hold a hand-written second copy of the prose rather than reading
     the field. */
  for (const manifest of manifests) {
    for (const [field, prose] of [
      ["about", RESUME_DATA.about],
      ["summary", RESUME_DATA.summary],
      /* #116: the positioning copy an agent reads to decide whether Lorenzo
         fits a brief. It renders nowhere in the HTML, so this loop is the only
         thing standing between it and the silent drift #52 recorded. */
      ["agentGuidance", RESUME_DATA.agentGuidance],
    ] as const) {
      test(`${manifest} publishes the same ${field} as the data module`, async ({
        request,
      }) => {
        const response = await request.get(manifest);
        expect(response.status()).toBe(200);

        /* The manifests are plain text with hard-wrapped paragraphs elsewhere,
           so each paragraph is matched on its own rather than the joined
           string. */
        const text = await response.text();
        for (const paragraph of prose.split("\n\n")) {
          expect(
            text,
            `${manifest} should not fall behind RESUME_DATA.${field}`,
          ).toContain(paragraph);
        }
      });
    }

    /* #116 requires the guidance name best-fit engagements *and* how to make
       contact. The address is deliberately absent from `agentGuidance` — it
       already exists as `contact.email` — so the section is only complete if
       the manifest carries both halves. Scoped to the section rather than the
       whole file: `llms-full.txt` publishes the address again under
       `## Contact`, so a file-wide match would pass with the contact line
       deleted. */
    test(`${manifest} pairs the guidance with a way to make contact`, async ({
      request,
    }) => {
      const response = await request.get(manifest);
      expect(response.status()).toBe(200);

      const text = await response.text();
      const heading = "## When to use this";
      const start = text.indexOf(heading);
      expect(
        start,
        `${manifest} should tell an agent when this profile fits`,
      ).toBeGreaterThan(-1);

      const rest = text.slice(start + heading.length);
      const next = rest.indexOf("\n## ");
      const section = next === -1 ? rest : rest.slice(0, next);

      expect(
        section,
        `the ${manifest} guidance section should publish RESUME_DATA.contact.email`,
      ).toContain(RESUME_DATA.contact.email);
    });

    /* #116 landed a new first bullet on the current role — the sentence saying
       what Complaion *is* — and the manifests restate the work bullets by hand,
       the same shape of duplicate `about` and `summary` already have a guard
       for. `llms-full.txt` is the full mirror, so every bullet of every role is
       in scope there; `llms.txt` is a summary by design and carries only the
       current role, so only its first bullet is. The first run of this caught
       `llms-full.txt` publishing the GSK figure as `10,000 m3` against the data
       module's `10,000 m³`. */
    const bulletsOf = ({ description }: (typeof RESUME_DATA.work)[number]) =>
      [description].flat();
    const guardedBullets =
      manifest === "/llms-full.txt"
        ? RESUME_DATA.work.flatMap(bulletsOf)
        : bulletsOf(RESUME_DATA.work[0]).slice(0, 1);

    test(`${manifest} publishes the same work bullets as the data module`, async ({
      request,
    }) => {
      const text = await (await request.get(manifest)).text();

      expect(
        guardedBullets.filter((bullet) => !text.includes(bullet)),
        `${manifest} should not fall behind RESUME_DATA.work`,
      ).toEqual([]);
    });
  }

  test("no identity surface still claims the retired role label", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    const surfaces = await collectIdentitySurfaces(page, request, manifests);

    expect(
      surfaces.filter(({ text }) => text.includes(retiredRoleLabel)),
      `no surface should still say "${retiredRoleLabel}"`,
    ).toEqual([]);

    /* Guards the assertion above from passing because a surface came back
       empty and silently matched nothing. */
    expect(
      surfaces.filter(({ text }) => text.trim() === ""),
      "every identity surface should have content to audit",
    ).toEqual([]);
  });
});

/* #117: the siblings are declared in `llms.txt` as markdown, so an agent that
   followed the index has already committed to parsing markdown by the time it
   reads the body. Everything they *say* is covered by the identity lockstep
   above, which they joined; what only these can check is that the promise on
   the wrapper is kept — a route that fell through to the app shell would answer
   200 with an HTML document and pass every content assertion in this file. */
test.describe("markdown siblings", () => {
  for (const sibling of MARKDOWN_SIBLINGS) {
    test(`${sibling} serves markdown, not the app shell`, async ({
      request,
    }) => {
      const response = await request.get(sibling);

      expect(response.status()).toBe(200);
      expect(
        response.headers()["content-type"],
        `${sibling} is declared as markdown and must be served as markdown`,
      ).toContain(MARKDOWN_MEDIA_TYPE);

      const body = await response.text();
      expect(
        body.startsWith(`# ${RESUME_DATA.name}`),
        `${sibling} should open with a markdown heading, got: ${body.slice(0, 60)}`,
      ).toBe(true);
      expect(
        body.toLowerCase(),
        `${sibling} should not be an HTML document`,
      ).not.toContain("<html");
    });
  }
});

test.describe("freshness metadata", () => {
  test("profile JSON-LD and the sitemap share one build-derived date", async ({
    page,
    request,
  }) => {
    await page.goto("/");

    const profile = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) =>
        scripts
          .map((script) => JSON.parse(script.textContent ?? "{}"))
          .find((data) => data["@type"] === "ProfilePage"),
      );

    expect(
      profile,
      "the homepage should emit ProfilePage JSON-LD",
    ).toBeTruthy();
    expect(profile.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(
      profile.dateModified,
      "dateModified should not be the retired hardcoded date",
    ).not.toBe("2026-04-01");

    const modified = Date.parse(profile.dateModified);
    expect(
      modified,
      "dateModified should not be in the future",
    ).toBeLessThanOrEqual(Date.now());
    expect(
      Date.parse(profile.dateCreated),
      "dateCreated should precede dateModified",
    ).toBeLessThanOrEqual(modified);

    /* Both surfaces read the same build-time constant, so agreement is what
       proves the value is derived rather than typed in two places. */
    const sitemap = await (await request.get("/sitemap.xml")).text();
    const lastModified = sitemap.match(/<lastmod>(\d{4}-\d{2}-\d{2})/i)?.[1];
    expect(lastModified, "the sitemap should publish a lastmod").toBeTruthy();
    expect(profile.dateModified).toBe(lastModified);
  });
});
