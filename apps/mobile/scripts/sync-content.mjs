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
const lessonIds = JSON.parse(
  await readFile(path.join(mobile, "src/data/lesson-ids.json"), "utf8"),
);
if (!lessonIds || typeof lessonIds !== "object" || Array.isArray(lessonIds))
  throw Error("src/data/lesson-ids.json must be a title-to-ID object.");
const registeredIds = Object.values(lessonIds);
if (
  registeredIds.some(
    (id) => typeof id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id),
  ) ||
  new Set(registeredIds).size !== registeredIds.length
)
  throw Error("Lesson IDs must be unique lowercase slugs.");
const seenLessonIds = new Set();
const lessonsWithIds = lessons.map((lesson) => {
  const id = lessonIds[lesson.name];
  if (typeof id !== "string" || !id || seenLessonIds.has(id))
    throw Error(
      `Add a unique, stable ID for the source lesson "${lesson.name}" to src/data/lesson-ids.json. Preserve existing IDs when renaming lessons.`,
    );
  seenLessonIds.add(id);
  // The website's legacy quote field is not rendered by the native app. It
  // contains unneeded Scripture and translated source text, so keep it out of
  // the mobile bundle; the app uses the rights-audited primaryQuote/summary.
  const mobileLesson = { ...lesson };
  delete mobileLesson.quote;
  return { ...mobileLesson, id };
});
// Keep retired title-to-ID entries as tombstones. They reserve IDs against
// reuse if a lesson returns later and document renames for future migrations.
await mkdir(path.join(mobile, "src/data"), { recursive: true });
await writeFile(
  path.join(mobile, "src/data/lessons.json"),
  JSON.stringify(lessonsWithIds, null, 2) + "\n",
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
