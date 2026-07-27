/* The port this repo owns, for both `bun run dev` and the test runner.

   The two must agree. Next holds a lock at `.next/dev/lock` for the working
   directory, not the port, so a second `next dev` cannot start here on any port:
   a dev server you already have running has to be reused rather than replaced,
   and the runner's port cannot diverge from the dev script's. `PLAYWRIGHT_PORT`
   moves both, because the dev script reads it too. */
export const devServerPort = process.env.PLAYWRIGHT_PORT ?? "3200";
export const devServerUrl = `http://localhost:${devServerPort}`;

/* A marker this app serves and another app on the same port would not.
   `/llms.txt` is a static file, so probing it compiles no route, and the name is
   the one identity string that does not drift — roles, titles and bios are
   duplicated across llms.txt, the JSON-LD and route metadata and change often;
   the name does not. Pinned to RESUME_DATA.name by a test rather than imported,
   to keep app code out of the Playwright config's import graph. */
export const identityPath = "/llms.txt";
export const identityMarker = "Lorenzo Germini";

/* Split from the fetch so the discriminator is testable without a server.
   Returns the reason to refuse, or null when the server is ours. */
export function identityRefusal(response: {
  status: number;
  body: string;
}): string | null {
  if (response.status !== 200) {
    return `GET ${identityPath} returned ${response.status}, expected 200`;
  }

  if (!response.body.includes(identityMarker)) {
    return `GET ${identityPath} returned 200 but its body does not contain "${identityMarker}"`;
  }

  return null;
}
