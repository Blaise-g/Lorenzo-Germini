import {
  devServerPort,
  devServerUrl,
  identityPath,
  identityRefusal,
} from "./dev-server";

/* Playwright reuses whatever already listens on the port and cannot tell one app
   from another, so confirm this one is ours before any test trusts it. Runs after
   `webServer` is up. */
export default async function verifyDevServer() {
  let status: number;
  let body: string;

  try {
    /* Nothing else bounds this: a file-based globalSetup is outside the per-test
       timeout and no globalTimeout is set, so a server that accepts the
       connection and then stalls would hang the suite at zero tests. */
    const response = await fetch(`${devServerUrl}${identityPath}`, {
      signal: AbortSignal.timeout(10_000),
    });
    status = response.status;
    body = await response.text();
  } catch (cause) {
    throw new Error(
      `Could not reach ${devServerUrl}${identityPath} within 10s to confirm which app is serving port ${devServerPort}.`,
      { cause },
    );
  }

  const refusal = identityRefusal({ status, body });
  if (!refusal) return;

  throw new Error(
    [
      `The server on port ${devServerPort} is not this app.`,
      ``,
      `  ${refusal}`,
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
