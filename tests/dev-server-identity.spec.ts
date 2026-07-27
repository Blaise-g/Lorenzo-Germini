import { expect, test } from "@playwright/test";

import { identityMarker, judgeServerIdentity } from "./support/dev-server";

/* The suite once ran end to end against a different project's dev server that
   happened to hold the port, reporting failures across nearly every spec. These
   cover the discriminator that now refuses to start in that situation. */
test.describe("dev server identity", () => {
  test("refuses a server with no llms.txt at all", () => {
    const verdict = judgeServerIdentity({ status: 404, body: "" });

    expect(verdict.trusted).toBe(false);
    expect(verdict.trusted === false && verdict.reason).toContain("404");
  });

  test("refuses a server that serves someone else's llms.txt", () => {
    const verdict = judgeServerIdentity({
      status: 200,
      body: "# Alpes d'OC Morinesio\n\n> Agriturismo e Prodotti Artigianali.\n",
    });

    expect(verdict.trusted).toBe(false);
    expect(verdict.trusted === false && verdict.reason).toContain(
      identityMarker,
    );
  });

  test("refuses a body that only resembles ours", () => {
    const verdict = judgeServerIdentity({
      status: 200,
      body: "# Lorenzo\n\n> Full-Stack AI Engineer based in Turin, Italy.\n",
    });

    expect(verdict.trusted).toBe(false);
  });

  test("trusts this app", () => {
    const verdict = judgeServerIdentity({
      status: 200,
      body: "# Lorenzo Germini\n\n> Full-Stack AI Engineer shipping production systems.\n",
    });

    expect(verdict.trusted).toBe(true);
  });
});
