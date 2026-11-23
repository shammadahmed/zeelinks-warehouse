/** Run the real React → FastAPI → SQLite flow in an isolated temporary store. */
import { chromium, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dataDir = await mkdtemp(path.join(tmpdir(), "zeelinks-browser-"));
const output = path.join(root, "docs/screenshots");
const port = Number(process.env.ZEELINKS_BROWSER_PORT || 3101);
const baseURL = `http://127.0.0.1:${port}`;
const localPython = path.join(
  root,
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
const python =
  process.env.ZEELINKS_PYTHON ||
  (existsSync(localPython) ? localPython : "python");
let browser;
let logs = "";
let spawnError;
const server = spawn(
  python,
  [
    "-m",
    "uvicorn",
    "server.app:app",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    cwd: root,
    env: { ...process.env, DATA_DIR: dataDir },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
server.stdout.on("data", (chunk) => {
  logs += chunk;
});
server.stderr.on("data", (chunk) => {
  logs += chunk;
});
server.on("error", (error) => {
  spawnError = error;
});

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;
    if (server.exitCode !== null)
      throw new Error(`FastAPI exited before startup.\n${logs}`);
    try {
      const response = await fetch(`${baseURL}/api/health`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) return;
    } catch {
      /* Startup is still in progress. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`FastAPI did not start within 30 seconds.\n${logs}`);
}

try {
  await waitForServer();
  for (const [id, category, image] of [
    ["DEMO-WH-001", "Equipment", "crate"],
    ["DEMO-WH-002", "Electronics", "laptop"],
    ["DEMO-WH-003", "Tools", "tools"],
    ["DEMO-WH-004", "Furniture", "chair"],
    ["DEMO-WH-005", "Electronics", "camera"],
    ["DEMO-WH-006", "Tools", "drill"],
  ]) {
    const form = new FormData();
    form.append("assetId", id);
    form.append("category", category);
    form.append(
      "photo",
      new Blob([await readFile(path.join(root, `docs/demo/${image}.jpg`))], {
        type: "image/jpeg",
      }),
      `${image}.jpg`,
    );
    const response = await fetch(`${baseURL}/api/assets`, {
      method: "POST",
      body: form,
    });
    if (response.status !== 201)
      throw new Error(`Demo seed failed: ${await response.text()}`);
  }

  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1060 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseURL);
  await expect(page.locator(".brand-subtitle")).toHaveText("Warehouse");
  await expect(page.locator(".asset-card")).toHaveCount(6);
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(() =>
      page
        .locator(".card-photo img")
        .evaluateAll((images) =>
          images.every((image) => image.complete && image.naturalWidth > 0),
        ),
    )
    .toBe(true);
  await mkdir(output, { recursive: true });
  await page.screenshot({
    path: path.join(output, "dashboard-desktop.png"),
    fullPage: true,
  });

  const search = page.getByRole("textbox", { name: "Search by Asset ID" });
  await search.fill("wh-002");
  await expect(page.locator(".asset-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "View DEMO-WH-002", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("Manual entry"),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".detail-photo img")
        .evaluate((image) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  await page.screenshot({ path: path.join(output, "asset-detail.png") });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await search.fill("does-not-exist");
  await expect(
    page.getByRole("heading", { name: "No matching assets" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .last()
    .click();
  await expect(page.locator(".asset-card")).toHaveCount(6);

  await page.getByRole("button", { name: "Add asset", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Asset ID/).fill("DEMO-UI-007");
  await dialog.locator("select").selectOption("__custom");
  await dialog.getByLabel(/New category/).fill("Safety equipment");
  await dialog
    .getByLabel("Upload asset photograph")
    .setInputFiles(path.join(root, "docs/demo/drill.jpg"));
  await expect(dialog.getByAltText("Selected asset preview")).toBeVisible();
  await page.screenshot({ path: path.join(output, "register-form.png") });
  await dialog.getByRole("button", { name: "Save asset", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "DEMO-UI-007 has been registered.",
  );
  await expect(page.locator(".asset-card")).toHaveCount(7);

  // A duplicate remains in the form with an actionable error; no second row is created.
  await page.getByRole("button", { name: "Add asset", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Asset ID/).fill("demo-ui-007");
  await dialog.locator("select").selectOption("Tools");
  await dialog
    .getByLabel("Upload asset photograph")
    .setInputFiles(path.join(root, "docs/demo/tools.jpg"));
  await dialog.getByRole("button", { name: "Save asset", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "An asset with this ID already exists.",
  );
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();

  await page.getByRole("button", { name: "List view" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(7);
  await page.getByRole("button", { name: "Grid view" }).click();
  await page
    .getByRole("combobox", { name: "Filter by category" })
    .selectOption("Electronics");
  await expect(page.locator(".asset-card")).toHaveCount(2);
  await page
    .getByRole("combobox", { name: "Filter by category" })
    .selectOption("");
  await expect(page.locator(".asset-card")).toHaveCount(7);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Add asset", exact: true }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  if (overflow) throw new Error("The mobile dashboard overflows horizontally.");
  await page.screenshot({
    path: path.join(output, "dashboard-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Add asset", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  if (errors.length) throw new Error(`Browser errors: ${errors.join("; ")}`);
  console.log(`Browser workflow passed. Four screenshots saved to ${output}`);
} finally {
  await browser?.close();
  if (server.exitCode === null && !spawnError) {
    server.kill();
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      new Promise((resolve) =>
        setTimeout(() => {
          server.kill("SIGKILL");
          resolve();
        }, 3000),
      ),
    ]);
  }
  await rm(dataDir, { recursive: true, force: true });
}
