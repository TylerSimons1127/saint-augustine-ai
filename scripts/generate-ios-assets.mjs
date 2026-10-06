import { copyFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const heart = await readFile(path.join(root, "assets", "heart.svg"));
const heartUri = `data:image/svg+xml;base64,${heart.toString("base64")}`;
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#f6f2eb"/><image href="${heartUri}" x="-48" y="-48" width="1120" height="1120" preserveAspectRatio="xMidYMid meet"/></svg>`;
const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732"><rect width="2732" height="2732" fill="#f6f2eb"/><image href="${heartUri}" x="1036" y="790" width="660" height="776" preserveAspectRatio="xMidYMid meet"/><text x="1366" y="1640" text-anchor="middle" fill="#34281e" font-family="Georgia, 'Times New Roman', serif" font-size="130">Saint Augustine AI</text><text x="1366" y="1736" text-anchor="middle" fill="#82715e" font-family="Arial, sans-serif" font-size="42" letter-spacing="9">A CATHOLIC COMPANION</text></svg>`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0"><img id="icon" style="display:block;width:1024px;height:1024px" src="data:image/svg+xml;base64,${Buffer.from(iconSvg).toString("base64")}"></body></html>`);
  await page.locator("#icon").evaluate((image) => image.decode());
  const iconPath = path.join(root, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset", "AppIcon-512@2x.png");
  await page.locator("#icon").screenshot({ path: iconPath, animations: "disabled" });

  const splashPage = await browser.newPage({ viewport: { width: 2732, height: 2732 }, deviceScaleFactor: 1 });
  await splashPage.setContent(`<html><body style="margin:0"><img id="splash" style="display:block;width:2732px;height:2732px" src="data:image/svg+xml;base64,${Buffer.from(splashSvg).toString("base64")}"></body></html>`);
  await splashPage.locator("#splash").evaluate((image) => image.decode());
  const splashDirectory = path.join(root, "ios", "App", "App", "Assets.xcassets", "Splash.imageset");
  const generatedSplash = path.join(root, "mobile", "splash-2732x2732.png");
  await splashPage.locator("#splash").screenshot({ path: generatedSplash, animations: "disabled" });
  for (const filename of ["splash-2732x2732-2.png", "splash-2732x2732-1.png", "splash-2732x2732.png"]) {
    await copyFile(generatedSplash, path.join(splashDirectory, filename));
  }
  await import("node:fs/promises").then(({ unlink }) => unlink(generatedSplash));
  console.log("Generated the iOS app icon and branded launch screen.");
} finally {
  await browser.close();
}
