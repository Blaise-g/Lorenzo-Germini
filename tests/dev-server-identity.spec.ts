import { expect, test } from "@playwright/test";

import { RESUME_DATA } from "@/data/resume-data";

import { identityMarker, identityRefusal } from "./support/dev-server";

/* The suite once ran end to end against a different project's dev server that
   happened to hold the port, reporting failures across nearly every spec. */
test.describe("dev server identity", () => {
  test("refuses a server with no llms.txt at all", () => {
    expect(identityRefusal({ status: 404, body: "" })).toContain("404");
  });

  for (const [description, body] of [
    [
      "another project's own llms.txt",
      "# Alpes d'OC Morinesio\n\n> Agriturismo.\n",
    ],
    [
      "a body that only resembles ours",
      "# Lorenzo\n\n> AI Product Engineer.\n",
    ],
  ] as const) {
    test(`refuses ${description}`, () => {
      expect(identityRefusal({ status: 200, body })).toContain(identityMarker);
    });
  }

  test("trusts this app", () => {
    const body = `# ${identityMarker}\n\n> AI Product Engineer.\n`;

    expect(identityRefusal({ status: 200, body })).toBeNull();
  });

  /* The marker is duplicated rather than imported, to keep app code out of the
     Playwright config's import graph. This is the check that the copy stays
     honest — renaming in the data module would otherwise leave the probe
     refusing the real server. */
  test("the marker still matches the name the app publishes", () => {
    expect(identityMarker).toBe(RESUME_DATA.name);
  });
});

/* One source for the port (AGENTS.md): the dev script's default and the
   support module's agree, and no script reads `PLAYWRIGHT_PORT` itself. */
test.describe("the dev server's port", () => {
  test("the dev script's default is the support module's", async () => {
    const { readFile } = await import("node:fs/promises");
    const pkg = JSON.parse(await readFile("package.json", "utf8"));
    const fallback = pkg.scripts.dev.match(/PLAYWRIGHT_PORT:-(\d+)/)?.[1];
    expect(fallback).toBeDefined();
    /* The module reads the variable at import; the default is the literal
       it falls back to, so read that from its source. */
    const source = await readFile("tests/support/dev-server.ts", "utf8");
    expect(source).toContain(`process.env.PLAYWRIGHT_PORT ?? "${fallback}"`);
  });

  test("no script reads PLAYWRIGHT_PORT or a port of its own", async () => {
    const { readdir, readFile } = await import("node:fs/promises");
    for (const file of await readdir("scripts")) {
      const source = await readFile(`scripts/${file}`, "utf8");
      expect(source, file).not.toMatch(/PLAYWRIGHT_PORT\s*\?\?|localhost:\d/);
    }
  });
});
