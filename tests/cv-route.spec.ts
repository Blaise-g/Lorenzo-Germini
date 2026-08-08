import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import retainedProof from "@/../docs/spec/retained-proof.json";
import { RESUME_DATA } from "@/data/resume-data";

import { personStructuredData } from "./support/structured-data";

const cvPath = "/cv";
const pdfFilename = "lorenzo-germini-cv.pdf";

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePdfText(value: string) {
  return normalizeWhitespace(value.replace(/-\s*\n\s*/g, "-"));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("canonical CV route", () => {
  test("publishes the complete resume from the shared data source", async ({
    page,
  }) => {
    await page.goto(cvPath);

    await expect(page).toHaveTitle("Lorenzo-Germini-CV");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new URL(cvPath, RESUME_DATA.personalWebsiteUrl).href,
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      RESUME_DATA.name,
    );
    await expect(page.getByText(/^Updated [A-Z][a-z]+ \d{4}$/)).toBeVisible();

    const mainText = normalizeWhitespace(
      await page.getByRole("main").innerText(),
    );
    /* `innerText`, so this is what the screen publishes. The contact values are
       deliberately absent from it — the address row is print-only now, and the
       footer carries the same contacts on screen — so they are asserted against
       the printed document in "the CV contact row" below rather than loosened
       into a `textContent` read that would pass for a hidden element too. */
    for (const value of [
      RESUME_DATA.summary,
      ...RESUME_DATA.skills,
      ...RESUME_DATA.skillGroups.flatMap((group) => [
        group.name,
        ...group.skills,
      ]),
      ...RESUME_DATA.work.flatMap((work) => [
        work.company,
        work.title,
        work.start,
        work.end,
        ...(typeof work.description === "string"
          ? [work.description]
          : work.description),
      ]),
      ...RESUME_DATA.education.flatMap((education) => [
        education.school,
        education.degree,
        education.start,
        education.end,
      ]),
      ...RESUME_DATA.projects.flatMap((project) => [
        project.title,
        project.description,
        ...project.techStack,
      ]),
    ]) {
      expect(mainText).toContain(normalizeWhitespace(value));
    }

    const download = page.getByRole("link", { name: "Download CV (PDF)" });
    await expect(download).toHaveAttribute("href", `/${pdfFilename}`);
    await expect(download).toHaveAttribute("download", pdfFilename);
  });

  test("publishes CV-specific structured and social metadata", async ({
    page,
  }) => {
    await page.goto(cvPath);

    const person = await personStructuredData(page);

    expect(person).toMatchObject({
      "@type": "Person",
      name: RESUME_DATA.name,
      alumniOf: RESUME_DATA.education.map((education) => ({
        "@type": "EducationalOrganization",
        name: education.school,
      })),
    });
    /* Spec §2.7: both title fields state the positioning label, not the
       employer's job title — which the work history below still carries. */
    expect(person.jobTitle).toBe(RESUME_DATA.roleLabel);
    expect(person.hasOccupation).toMatchObject({
      "@type": "Occupation",
      name: RESUME_DATA.roleLabel,
    });
    expect(person.worksFor).toMatchObject({
      name: RESUME_DATA.work[0].company,
    });

    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      /CV/,
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/cv\/opengraph-image/,
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      "content",
      /\/cv\/opengraph-image/,
    );
  });

  /* Spec §2's context-dependent CV action, without the palette that used to
     carry it (#89): reaching `/cv` is a visible link off-route, and printing is
     the document's own button on-route. Both halves in one test, because the
     defect is the pair coming apart — a route with no way in, or a document with
     no way to paper. */
  test("offers a visible route to the CV off-route and prints it on-route", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    /* `main`, not the whole page: the footer's CV link is not the one a reader
       at the top of the homepage can reach. */
    const cvLinks = page.locator('main a[href="/cv"]:visible');
    expect(
      await cvLinks.count(),
      "the homepage should offer at least one visible route to /cv",
    ).toBeGreaterThan(0);
    await cvLinks.first().click();
    await expect(page).toHaveURL(/\/cv$/);

    await page.evaluate(() => {
      window.print = () => {
        document.documentElement.dataset.printCalled = "true";
      };
    });
    const printCv = page.getByRole("button", { name: "Print CV" });
    await expect(printCv).toBeVisible();
    await printCv.click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-print-called",
      "true",
    );
  });

  test("permanently redirects the legacy resume URL and lists the CV", async ({
    request,
  }) => {
    const redirect = await request.get("/resume", { maxRedirects: 0 });
    expect(redirect.status()).toBe(301);
    expect(redirect.headers().location).toBe("/cv");

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain(
      new URL(cvPath, RESUME_DATA.personalWebsiteUrl).href,
    );
    /* #104's other half: the PDF duplicates a page the sitemap already lists,
       and its canonical consolidates onto that page, so it stays out. Asserted
       beside the positive case because the pair is one claim — the sitemap
       names the page, not the file. */
    expect(sitemap).not.toContain(pdfFilename);
  });

  /* #104: the PDF is crawlable and Google indexes PDFs, so it points at `/cv`
     rather than competing with it. The expected URL is spelled out rather than
     derived: `RESUME_DATA.personalWebsiteUrl` *is* the `CANONICAL_ORIGIN` the
     config builds the header from, so composing it here would let both sides
     drift together and still pass. */
  test("serves the CV PDF with a canonical Link header, and still serves the PDF", async ({
    request,
  }) => {
    const pdf = await request.get(`/${pdfFilename}`);

    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
    /* Not `toContain`: the whole header value, so a second `rel` or a truncated
       URL fails rather than passing on a substring. */
    expect(pdf.headers().link).toBe(
      '<https://lorenzogermini.com/cv>; rel="canonical"',
    );
  });
});

test("the homepage and CV retain every protected technical proof term", async ({
  page,
}) => {
  const routeText: string[] = [];
  for (const route of ["/", cvPath]) {
    await page.goto(route);
    routeText.push(await page.getByRole("main").innerText());
  }
  const visibleText = normalizeWhitespace(routeText.join(" ")).toLowerCase();

  const missing = retainedProof.terms.flatMap((entry) => {
    const passes =
      entry.acceptedAnyOf !== undefined
        ? entry.acceptedAnyOf.some((term) =>
            visibleText.includes(term.toLowerCase()),
          )
        : entry.requiredAllOf!.every((term) =>
            visibleText.includes(term.toLowerCase()),
          );
    return passes ? [] : [entry.id];
  });

  expect(missing).toEqual([]);
});

test("the build-generated PDF is current, readable, and single-column", async () => {
  const pdfPath = path.join(process.cwd(), "public", pdfFilename);
  const packageJson = JSON.parse(
    await readFile(path.join(process.cwd(), "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };
  const vercelConfig = JSON.parse(
    await readFile(path.join(process.cwd(), "vercel.json"), "utf8"),
  ) as { installCommand: string };

  expect(packageJson.scripts["install:cv-browser"]).toBe(
    "playwright install chromium --only-shell",
  );
  expect(packageJson.scripts.build).toContain("install:cv-browser");
  expect(packageJson.scripts.build.indexOf("install:cv-browser")).toBeLessThan(
    packageJson.scripts.build.indexOf("generate:cv"),
  );
  expect(packageJson.scripts["generate:cv"]).toBeTruthy();
  expect(vercelConfig.installCommand).toBe(
    "bun install && dnf install -y nspr nss dbus-libs libXdamage libXext libXfixes mesa-libgbm libxcb libxkbcommon systemd-libs",
  );

  const extracted = normalizePdfText(
    execFileSync("pdftotext", ["-layout", pdfPath, "-"], {
      encoding: "utf8",
    }),
  );

  for (const value of [
    RESUME_DATA.summary,
    RESUME_DATA.contact.email,
    ...RESUME_DATA.skillGroups.flatMap((group) => [
      group.name,
      ...group.skills,
    ]),
    ...RESUME_DATA.work.flatMap((work) =>
      typeof work.description === "string"
        ? [work.description]
        : work.description,
    ),
    ...RESUME_DATA.education.flatMap((education) => [
      education.school,
      education.degree,
    ]),
    ...RESUME_DATA.projects.flatMap((project) => [
      project.title,
      project.description,
    ]),
  ]) {
    expect(extracted).toContain(normalizeWhitespace(value));
  }

  for (const work of RESUME_DATA.work) {
    const adjacency = new RegExp(
      `${escapeRegExp(work.title)}\\s+${escapeRegExp(work.company)}\\s+${escapeRegExp(work.start)}\\s*[-–]\\s*${escapeRegExp(work.end)}`,
      "i",
    );
    expect(extracted).toMatch(adjacency);
  }

  const sectionOrder = [
    "PROFILE",
    "EXPERIENCE",
    "SELECTED SYSTEMS",
    "EDUCATION",
    "SKILLS",
  ].map((section) => extracted.indexOf(section));
  expect(sectionOrder.every((index) => index >= 0)).toBe(true);
  expect(sectionOrder).toEqual([...sectionOrder].sort((a, b) => a - b));
});

/* #85: the contact surfaces. The number came out of all six of them, and the
   address row was trimmed rather than deleted — `SiteFooter`'s inner div is
   `print:hidden`, so on paper this row is the printed CV's only contact surface
   and deleting it ships a PDF a reader cannot reply to.
   It is print-only now (#74 follow-up): the footer carries the same email and
   socials on screen, so the row was a repetition there and the sole contact
   surface on paper. That asymmetry is the thing worth pinning — a `print:flex`
   that regressed to `flex` would look harmless on screen while quietly
   restoring the duplication, and one that lost `print:flex` would ship an
   unanswerable PDF. Both directions are asserted below. */
test.describe("the CV contact row", () => {
  test("carries no phone number, on the page or in the JSON-LD", async ({
    page,
  }) => {
    await page.goto(cvPath);

    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(page.getByText("3279220232")).toHaveCount(0);

    const person = await personStructuredData(page);
    expect(person).not.toHaveProperty("telephone");
  });

  test("keeps email, location, site, GitHub and LinkedIn, and drops X", async ({
    page,
  }) => {
    /* Under print, because that is the only medium the row renders in now. */
    await page.emulateMedia({ media: "print" });
    await page.goto(cvPath);
    const address = page.locator("address");
    await expect(address).toBeVisible();

    /* Location and GitHub stay against the owner's instinct and with his
       agreement: the CV body carries no code link anywhere else, so this row is
       the printed CV's only route to it, and location is what a hiring reader
       filters on. */
    await expect(address).toContainText(RESUME_DATA.contact.email);
    await expect(address).toContainText(RESUME_DATA.location);
    for (const name of ["GitHub", "LinkedIn"]) {
      await expect(
        address.getByRole("link", { name, exact: true }),
      ).toHaveCount(1);
    }

    /* Dropped by the `cv: false` data flag, not by a hardcoded name filter, so X
       stays on the homepage and in the footer. */
    await expect(
      address.getByRole("link", { name: "X", exact: true }),
    ).toHaveCount(0);
    const x = RESUME_DATA.contact.social.find((social) => social.name === "X");
    expect(x?.cv).toBe(false);

    /* Back to screen for the footer, which is `print:hidden` — `getByRole` reads
       the accessibility tree, so a `display: none` footer has no links in it at
       all and this would pass for the wrong reason under print. */
    await page.emulateMedia({ media: "screen" });
    await expect(
      page
        .getByRole("contentinfo")
        .getByRole("link", { name: "X", exact: true }),
    ).toHaveCount(1);
  });

  test("is off the screen, where the footer already carries the same contacts", async ({
    page,
  }) => {
    await page.goto(cvPath);

    await expect(page.locator("address")).toBeHidden();

    /* The reason it can go: the same email and every social link are reachable
       on screen from the footer. If this ever stops holding, the row has to come
       back rather than the assertion above being relaxed.
       By `href`, not by name: the footer labels the link "Email" rather than
       spelling the address out, and it is the destination that has to match. */
    const footer = page.getByRole("contentinfo");
    await expect(
      footer.locator(`a[href="mailto:${RESUME_DATA.contact.email}"]`),
    ).toHaveCount(1);
    for (const social of RESUME_DATA.contact.social) {
      await expect(
        footer.getByRole("link", { name: social.name, exact: true }),
      ).toHaveCount(1);
    }
  });

  test("no longer carries the browser print hint on any medium", async ({
    page,
  }) => {
    /* It was `print:hidden` rather than absent, which is how it came to be baked
       into the shipped PDF in the first place — `pdftotext` found it there. Gone
       outright now, so assert absence rather than invisibility: a hint that
       returns as `print:hidden` would satisfy a `toBeHidden()` under print. */
    const hint = /uncheck browser headers and footers/i;

    await page.goto(cvPath);
    await expect(page.getByText(hint)).toHaveCount(0);

    await page.emulateMedia({ media: "print" });
    await expect(page.getByText(hint)).toHaveCount(0);
  });

  test("the header's 2px rule is print-only, now the row below it is", async ({
    page,
  }) => {
    /* The rule closed the header against the body, and with the address row in
       it that is what it read as. Print-only once the row left: on screen it sat
       directly beneath the button group as a stray divider, and the section nav
       under it carries its own rule. Asserted as computed width on both media,
       because `border-b-ink` stays either way — only the width moves. */
    const header = page.locator("header.cv-header");
    const borderWidth = () =>
      header.evaluate((el) => getComputedStyle(el).borderBottomWidth);

    await page.goto(cvPath);
    expect(await borderWidth()).toBe("0px");

    await page.emulateMedia({ media: "print" });
    expect(await borderWidth()).toBe("2px");
  });
});

/* #87: `/cv` is 4,430px tall at 375 across six sections and carried no `<nav>` at
   all — landmark navigation offered `main` and `contentinfo` and nothing else,
   and the only route out was a "Back home" text link wedged between two
   buttons. */
test.describe("the CV section nav", () => {
  test("exposes a navigation landmark whose anchors all resolve", async ({
    page,
  }) => {
    await page.goto(cvPath);

    const nav = page.getByRole("navigation", { name: "On this page" });
    await expect(nav).toBeVisible();

    const links = await nav.getByRole("link").all();
    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      const href = await link.getAttribute("href");
      expect(href).toMatch(/^#/);
      /* A row that indexes an id nothing carries is worse than no row. */
      await expect(page.locator(href!)).toHaveCount(1);
    }
  });

  test("does not print", async ({ page }) => {
    await page.goto(cvPath);
    await page.emulateMedia({ media: "print" });
    await expect(
      page.getByRole("navigation", { name: "On this page" }),
    ).toBeHidden();
  });
});
