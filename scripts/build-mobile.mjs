import { access, cp, copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "mobile", "www");
const requiredFiles = [
  "index.html",
  "landing.html",
  "config.js",
  "app-data.js",
  "app-features.css",
  "app-features.js",
  "frontend-revamp.css",
  "frontend-revamp.js",
  "lessons.js",
  "lesson-sources.js",
  "manifest.webmanifest",
  "sw.js",
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of requiredFiles) {
  await copyFile(path.join(root, file), path.join(output, file));
}
await cp(path.join(root, "assets"), path.join(output, "assets"), { recursive: true });

const indexPath = path.join(output, "index.html");
let html = await readFile(indexPath, "utf8");
const serviceWorkerRegistration = 'if("serviceWorker" in navigator){ window.addEventListener("load",()=>{ navigator.serviceWorker.register("sw.js").catch(()=>{}); }); }';
if (!html.includes(serviceWorkerRegistration)) {
  throw new Error("Could not find the app's service-worker registration in index.html.");
}
html = html.replace(
  serviceWorkerRegistration,
  'if("serviceWorker" in navigator && !(window.Capacitor && typeof window.Capacitor.isNativePlatform==="function" && window.Capacitor.isNativePlatform())){ window.addEventListener("load",()=>{ navigator.serviceWorker.register("sw.js").catch(()=>{}); }); }',
);

const frontendScriptPattern = /<script src="frontend-revamp\.js(?:\?[^\"]*)?" defer><\/script>/;
if (!frontendScriptPattern.test(html)) {
  throw new Error("Could not find the frontend script insertion point in index.html.");
}
if (!html.includes("mobile-native-bridge.js")) {
  html = html.replace(frontendScriptPattern, '<script src="mobile-native-bridge.js" defer></script>\n$&');
}
if (html.includes(serviceWorkerRegistration)) {
  throw new Error("The native build would still register the website service worker.");
}
await writeFile(indexPath, html, "utf8");

await build({
  entryPoints: [path.join(root, "mobile", "native-bridge.js")],
  outfile: path.join(output, "mobile-native-bridge.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["safari16"],
  minify: true,
});

for (const asset of ["assets/bg.jpg", "assets/heart.svg", "lessons.js", "app-features.js", "config.js"]) {
  await access(path.join(output, asset));
}

console.log(`Built local iOS web assets at ${path.relative(root, output)}.`);
