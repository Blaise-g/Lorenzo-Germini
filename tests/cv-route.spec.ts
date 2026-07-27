import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import retainedProof from "@/../docs/spec/retained-proof.json";
import { RESUME_DATA } from "@/data/resume-data";

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
      RESUME_DATA.contact.tel,
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

    const person = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) =>
        scripts
          .map((script) => JSON.parse(script.textContent ?? "{}"))
          .find((data) => data["@type"] === "Person"),
      );

    expect(person).toMatchObject({
      "@type": "Person",
      name: RESUME_DATA.name,
      alumniOf: RESUME_DATA.education.map((education) => ({
        "@type": "EducationalOrganization",
        name: education.school,
      })),
    });
    expect(person.hasOccupation).toMatchObject({
      "@type": "Occupation",
      name: RESUME_DATA.work[0].title,
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
    await page.getByRole("button", { name: "Open command menu" }).click();
    const viewCv = page.getByRole("option", { name: "View CV" });
    await expect(viewCv).toBeVisible();
    await viewCv.click();
    await expect(page).toHaveURL(/\/cv$/);

    await page.evaluate(() => {
      window.print = () => {
        document.documentElement.dataset.printCalled = "true";
      };
    });
    await page.getByRole("button", { name: "Open command menu" }).click();
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

  expect(packageJson.scripts.build).toContain("generate:cv");
  expect(packageJson.scripts["generate:cv"]).toBeTruthy();

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
