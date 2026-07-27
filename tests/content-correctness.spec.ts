import { expect, test } from "@playwright/test";

import { contrast } from "./support/color";
import { openCommandPalette } from "./support/command-palette";
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

  /* The command menu navigates with window.open rather than an anchor, so it is
     invisible to the rel audit above and needs its own check: without
     windowFeatures the opened tab keeps a live window.opener. */
  test("the command menu opens links without handing over an opener", async ({
    page,
  }) => {
    await page.goto("/");

    const calls: (string | undefined)[] = [];
    await page.exposeFunction("recordWindowOpen", (features?: string) => {
      calls.push(features);
    });
    await page.evaluate(() => {
      window.open = (
        _url?: string | URL,
        _target?: string,
        features?: string,
      ) => {
        (
          window as unknown as {
            recordWindowOpen: (features?: string) => void;
          }
        ).recordWindowOpen(features);
        return null;
      };
    });

    await openCommandPalette(page);
    await page.getByRole("option", { name: /GitHub/i }).click();

    expect(calls, "the command menu should have opened a window").toHaveLength(
      1,
    );
    expect(calls[0] ?? "").toContain("noopener");
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
      /* The command-menu hint only renders at xl and up, so measure wide
         enough to include the historical smallest metadata element. */
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/");
      await expect(page.locator("kbd").first()).toBeVisible();

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
