import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import retainedProof from "@/../docs/spec/retained-proof.json";
import { RESUME_DATA } from "@/data/resume-data";

import { openCommandPalette } from "./support/command-palette";
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
    for (const value of [
      RESUME_DATA.summary,
      RESUME_DATA.contact.email,
      RESUME_DATA.location,
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
    await expect(
      page.getByText(/uncheck browser headers and footers/i),
    ).toBeVisible();
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

  test("offers View CV off-route and Print CV on-route", async ({ page }) => {
    await page.goto("/");
    await openCommandPalette(page);
    const viewCv = page.getByRole("option", { name: "View CV" });
    await expect(viewCv).toBeVisible();
    await viewCv.click();
    await expect(page).toHaveURL(/\/cv$/);

    await page.evaluate(() => {
      window.print = () => {
        document.documentElement.dataset.printCalled = "true";
      };
    });
    await openCommandPalette(page);
    const printCv = page.getByRole("option", { name: "Print CV" });
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

/* #85: the contact surfaces. The number came out of all six of them, the address
   row was trimmed rather than deleted — `SiteFooter`'s inner div is
   `print:hidden`, so this row is the printed CV's only contact surface and
   deleting it ships a PDF a reader cannot reply to — and the browser hint that
   was baked into the shipped artefact now stays on screen. */
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
    await page.goto(cvPath);
    const address = page.locator("address");

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
       stays on the homepage, the footer and the command palette. */
    await expect(
      address.getByRole("link", { name: "X", exact: true }),
    ).toHaveCount(0);
    const x = RESUME_DATA.contact.social.find((social) => social.name === "X");
    expect(x?.cv).toBe(false);
    await expect(
      page
        .getByRole("contentinfo")
        .getByRole("link", { name: "X", exact: true }),
    ).toHaveCount(1);
  });

  test("keeps the browser hint on screen and off the page", async ({
    page,
  }) => {
    const hint = /uncheck browser headers and footers/i;

    await page.goto(cvPath);
    await expect(page.getByText(hint)).toBeVisible();

    /* The defect: with no `print:hidden` it computed `display: block` between the
       role line and the address block, and `pdftotext` found it in the checked-in
       file served behind "Download CV (PDF)". */
    await page.emulateMedia({ media: "print" });
    await expect(page.getByText(hint)).toBeHidden();
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
