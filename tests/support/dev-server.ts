/* The port this repo owns, for both `bun run dev` and the test runner.

   The two must agree. Next 16 holds a per-repo lock at `.next/dev/lock`, so a
   second `next dev` cannot start for this working directory on *any* port — if
   the dev script and the runner used different ports, running the suite while a
   dev server was up would fail to boot rather than reuse it. Keep this in step
   with the `dev` script in package.json, which has no way to carry a comment. */
export const devServerPort = process.env.PLAYWRIGHT_PORT ?? "3200";
export const devServerUrl = `http://localhost:${devServerPort}`;

/* A marker this app serves and another app on the same port would not.
   `/llms.txt` is a static file, so probing it compiles no route, and the name is
   the one identity string that does not drift — roles, titles and bios are
   duplicated across llms.txt, the JSON-LD and route metadata and change often;
   the name does not. */
export const identityPath = "/llms.txt";
export const identityMarker = "Lorenzo Germini";

export type IdentityVerdict =
  | { trusted: true }
  | { trusted: false; reason: string };

/* Split from the fetch so the discriminator is testable without a server:
   a 404 (a foreign app that has no such file) and a 200 whose body belongs to
   someone else must both be refused. */
export function judgeServerIdentity(response: {
  status: number;
  body: string;
}): IdentityVerdict {
  if (response.status !== 200) {
    return {
      trusted: false,
      reason: `GET ${identityPath} returned ${response.status}, expected 200`,
    };
  }

  if (!response.body.includes(identityMarker)) {
    return {
      trusted: false,
      reason: `GET ${identityPath} returned 200 but its body does not contain "${identityMarker}"`,
    };
  }

  return { trusted: true };
}
