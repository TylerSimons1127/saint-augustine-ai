import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const output = path.join(root, "mobile", "submission", "screenshots-draft");
const baseURL = "http://127.0.0.1:4173";
const server = spawn(process.execPath, [path.join(root, "scripts", "serve.mjs")], { cwd: root, stdio: "ignore" });

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch { /* server is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("The local app server did not become ready.");
}

async function captureDevice(browser, device, viewport, deviceScaleFactor) {
  const context = await browser.newContext({
    viewport,
    screen: viewport,
    deviceScaleFactor,
    isMobile: true,
    hasTouch: true,
  });
  await context.addInitScript(() => {
    localStorage.setItem("sa_beta_ok", "1");
    localStorage.setItem("sa_tut_v1", "1");
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseURL}/#chat`, { waitUntil: "domcontentloaded" });
  await page.locator("#page-chat").waitFor({ state: "visible" });
  await page.waitForTimeout(1600);

  for (const section of ["chat", "study", "prayer", "today"]) {
    if (section !== "chat") {
      await page.locator(`.nav-tab[data-page="${section}"]`).click();
      await page.locator(`#page-${section}`).waitFor({ state: "visible" });
      await page.waitForTimeout(section === "today" ? 2600 : 1000);
    }
    if (section === "today") {
      await page.locator("#dpReadings .dp-reading").first().waitFor({ state: "visible", timeout: 6000 }).catch(() => {});
    }
    const filename = `${device}-${section}.jpg`;
    await page.screenshot({
      path: path.join(output, filename),
      type: "jpeg",
      quality: 95,
      fullPage: false,
      animations: "disabled",
    });
    process.stdout.write(`Captured ${filename}\n`);
  }

  await context.close();
  if (errors.length) throw new Error(`${device} rendered with page errors: ${errors.join("; ")}`);
}

try {
  await mkdir(output, { recursive: true });
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  try {
    await captureDevice(browser, "iphone-17-pro", { width: 402, height: 874 }, 3);
    await captureDevice(browser, "ipad-pro-13", { width: 1032, height: 1376 }, 2);
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}
