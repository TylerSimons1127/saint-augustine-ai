import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(mobile, "../..");
const context = { window: {} };
vm.createContext(context);
for (const file of ["lessons.js", "lesson-sources.js"])
  vm.runInContext(await readFile(path.join(root, file), "utf8"), context, {
    timeout: 2000,
  });
const lessons = context.window.LESSON;
if (!Array.isArray(lessons) || lessons.length !== 32)
  throw Error("Expected all 32 source lessons");
await mkdir(path.join(mobile, "src/data"), { recursive: true });
await writeFile(
  path.join(mobile, "src/data/lessons.json"),
  JSON.stringify(lessons, null, 2) + "\n",
);
await mkdir(path.join(mobile, "assets/brand"), { recursive: true });
for (const name of ["saint-augustine-icon-512.png", "st-augustine.png"])
  await copyFile(
    path.join(root, "assets", name),
    path.join(mobile, "assets/brand", name),
  );
for (const name of [
  "bg_cloister-morning.jpg",
  "bg_coastal-light.jpg",
  "bg_lake-morning.jpg",
  "bg_autumn-light.jpg",
])
  await copyFile(
    path.join(root, "assets/bg", name),
    path.join(mobile, "assets/brand", name),
  );
console.log(
  "Synced 32 lessons with source metadata and existing brand artwork.",
);
