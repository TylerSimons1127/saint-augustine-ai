import fs from "node:fs";
import vm from "node:vm";

const scope = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL("../lessons.js", import.meta.url), "utf8"), scope);
vm.runInNewContext(fs.readFileSync(new URL("../lesson-sources.js", import.meta.url), "utf8"), scope);
const lessons = scope.window.LESSON;
const sources = scope.window.SA_LESSON_SOURCES;
const errors = [];

if (!Array.isArray(lessons) || lessons.length !== 32) errors.push(`Expected 32 lessons, found ${lessons?.length ?? "none"}.`);
if (!Array.isArray(sources) || sources.length !== lessons?.length) errors.push("Every lesson must have one reviewed source record.");
for (const [index, lesson] of (lessons || []).entries()) {
  const prefix = `Lesson ${index + 1} (${lesson.name || "unnamed"})`;
  for (const key of ["writing", "writingNote", "topic", "summary", "vocab", "questions", "sourceCitation", "sourceLabel", "primaryUrl", "quoteKind"]) {
    if (!lesson[key]) errors.push(`${prefix}: missing ${key}.`);
  }
  if (!Array.isArray(lesson.excerpt) || !lesson.excerpt.length) errors.push(`${prefix}: missing editorial/source reading content.`);
  if (!/^https?:\/\//i.test(lesson.primaryUrl || "")) errors.push(`${prefix}: source URL must use HTTP(S).`);
  if (lesson.quoteKind === "direct" && !lesson.primaryQuote) errors.push(`${prefix}: direct quote has no quote text.`);
  if (lesson.quoteKind !== "direct" && lesson.primaryQuote) errors.push(`${prefix}: unverified quote text must be labelled editorial, not stored as a direct quote.`);
}

function normalize(value) {
  return String(value || "").normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, " and ").replace(/&quot;|&#34;|&ldquo;|&rdquo;/g, '"').replace(/&#39;|&apos;|&lsquo;|&rsquo;/g, "'").replace(/<[^>]*>/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
}
function pageText(html) {
  return String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&mdash;|&#8212;|&ndash;|&#8211;/gi, " ").replace(/&amp;/gi, " and ").replace(/&quot;|&#34;|&ldquo;|&rdquo;/gi, '"').replace(/&#39;|&apos;|&lsquo;|&rsquo;/gi, "'").replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16))).replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

const uniqueUrls = [...new Set((sources || []).map((item) => item.url))];
const pages = new Map();
let cursor = 0;
async function worker() {
  while (cursor < uniqueUrls.length) {
    const url = uniqueUrls[cursor++];
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { "User-Agent": "SaintAugustineAI-source-check/1.0" } });
      if (!response.ok) { errors.push(`Source returned HTTP ${response.status}: ${url}`); continue; }
      const text = normalize(pageText(await response.text()));
      pages.set(url, text);
    } catch (error) {
      errors.push(`Could not fetch ${url}: ${error.message}`);
    }
  }
}
await Promise.all(Array.from({ length: Math.min(5, uniqueUrls.length) }, worker));

for (const [index, lesson] of (lessons || []).entries()) {
  if (lesson.quoteKind !== "direct") continue;
  const text = pages.get(lesson.primaryUrl);
  if (text && !text.includes(normalize(lesson.primaryQuote))) errors.push(`Direct quote mismatch in lesson ${index + 1} (${lesson.name}) against ${lesson.sourceCitation}.`);
}

if (errors.length) {
  console.error(errors.map((error) => `FAIL ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`PASS: ${lessons.length} lesson records; ${uniqueUrls.length} source pages resolve; all displayed direct quotes match their linked text.`);
  console.log(`Editorial wording is labelled separately in ${lessons.filter((lesson) => lesson.quoteKind === "editorial").length} lessons.`);
}
