import { spawn } from "node:child_process";
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const projectRoot = process.cwd();
const outputPath = path.join(projectRoot, "public", "lorenzo-germini-cv.pdf");
const temporaryPath = path.join(
  projectRoot,
  "tmp",
  "pdfs",
  `lorenzo-germini-cv-${process.pid}.pdf`,
);
const port = Number(process.env.CV_PDF_PORT ?? 3100);
const origin = `http://127.0.0.1:${port}`;
const nextCli = path.join(
  projectRoot,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);

await rm(outputPath, { force: true });
await mkdir(path.dirname(temporaryPath), { recursive: true });
await rm(temporaryPath, { force: true });

const server = spawn(
  process.execPath,
  [nextCli, "dev", "--hostname", "127.0.0.1", "--port", String(port)],
  {
    cwd: projectRoot,
    env: { ...process.env, NODE_ENV: "development" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let serverLog = "";
server.stdout.on("data", (chunk) => {
  serverLog += chunk;
});
server.stderr.on("data", (chunk) => {
  serverLog += chunk;
});

async function waitForCvRoute() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`CV render server exited early.\n${serverLog}`);
    }
    try {
      const response = await fetch(`${origin}/cv`);
      if (response.ok) return;
    } catch {
      // The server has not started accepting connections yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${origin}/cv.\n${serverLog}`);
}

async function stopServer() {
  if (server.exitCode !== null) return;

  server.kill("SIGTERM");
  const exitedGracefully = await new Promise((resolve) => {
    const onExit = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    const timeout = setTimeout(() => {
      server.off("exit", onExit);
      resolve(false);
    }, 5_000);
    server.once("exit", onExit);
  });

  if (exitedGracefully || server.exitCode !== null) return;

  server.kill("SIGKILL");
  await new Promise((resolve) => server.once("exit", resolve));
}

let browser;
try {
  await waitForCvRoute();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ colorScheme: "light" });
  await page.emulateMedia({ media: "print", colorScheme: "light" });
  await page.goto(`${origin}/cv`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  if ((await page.title()) !== "Lorenzo-Germini-CV") {
    throw new Error(
      "The CV route did not expose its controlled document title.",
    );
  }
  if ((await page.locator("[data-cv-document]").count()) !== 1) {
    throw new Error("The canonical CV document did not render.");
  }

  await page.pdf({
    displayHeaderFooter: false,
    format: "A4",
    outline: true,
    path: temporaryPath,
    preferCSSPageSize: false,
    printBackground: true,
    tagged: true,
  });
  await rename(temporaryPath, outputPath);
  process.stdout.write(`Generated ${path.relative(projectRoot, outputPath)}\n`);
} catch (error) {
  await rm(outputPath, { force: true });
  throw error;
} finally {
  await browser?.close();
  await rm(temporaryPath, { force: true });
  await stopServer();
}
