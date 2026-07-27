import {
  devServerPort,
  devServerUrl,
  identityPath,
  judgeServerIdentity,
} from "./dev-server";

/* Runs after `webServer` is up and before any test.

   Playwright reuses whatever already listens on the port and cannot tell one app
   from another. When a different project's dev server holds the port, every spec
   runs against that app and the suite reports dozens of failures that read like
   real regressions in this one. Refusing to start is the only outcome that names
   the actual problem. */
export default async function verifyDevServer() {
  let status: number;
  let body: string;

  try {
    const response = await fetch(`${devServerUrl}${identityPath}`);
    status = response.status;
    body = await response.text();
  } catch (cause) {
    throw new Error(
      `Could not reach ${devServerUrl}${identityPath} to confirm which app is serving port ${devServerPort}.`,
      { cause },
    );
  }

  const verdict = judgeServerIdentity({ status, body });
  if (verdict.trusted) return;

  throw new Error(
    [
      `The server on port ${devServerPort} is not this app.`,
      ``,
      `  ${verdict.reason}`,
      ``,
      `Another project's dev server is probably holding the port. Free it, or run`,
      `the suite somewhere else:`,
      ``,
      `  PLAYWRIGHT_PORT=3210 bun run test`,
      ``,
      `Without this check the suite runs against the other app and fails almost`,
      `everywhere, which looks like a regression here rather than a port clash.`,
    ].join("\n"),
  );
}
