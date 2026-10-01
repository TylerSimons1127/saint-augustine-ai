// Unit check: direct summary/fallback helpers produce the committed contract.
// Run separately; these helpers currently share the same server module cache as
// earlier tests when run through `npm test`.
const assert = require("assert");
process.env.PORT = "3996";
process.env.OPENROUTER_API_KEY = "test";
const { compactSaintSummary, buildSaintConnectionFallback, isSaintConnectionOutput } = require("./server.js");
const story = [
  "Saint Jerome devoted many years to translating Scripture from Hebrew into Latin for Christians throughout the Church.",
  "Augustine wrote to Jerome seeking his help with a difficult question about the soul.",
  "Jerome also wrote commentaries and letters that shaped Christian learning for generations after his death."
].join(" ");
const summary = compactSaintSummary(Array(20).fill(story).join(" "));
const words = summary.trim().split(/\s+/).length;
assert.ok(words >= 80 && words <= 210, `summary should be about half a long story, got ${words}`);
assert.ok(summary.includes("translating Scripture"), "summary keeps a defining early fact");
const conn = buildSaintConnectionFallback("Saint Jerome", story);
assert.ok(conn.includes("Letter 166") && conn.includes("Jerome"), "Jerome connection uses Augustine's primary correspondence");
assert.ok(conn.length <= 320, "connection remains card-sized");
const monicaBio = "Saint Monica was a patient mother whose persistent prayers for her son continued for many years.";
const groundedReflection = "Augustine's account of conversion and grace offers a useful perspective on Monica. Her patient prayers for her son, sustained over many years, show how hope can take the quiet form of faithful persistence.";
assert.ok(isSaintConnectionOutput(groundedReflection, "St. Monica", monicaBio), "reflection should name the saint and echo several details from her story");
assert.ok(!isSaintConnectionOutput(`${groundedReflection} Their friendship was close.`, "St. Monica", monicaBio), "reflection must not invent a direct relationship absent from the source");
assert.ok(!isSaintConnectionOutput("Let me analyze this saint. I should write a thoughtful reflection about her story.", "St. Monica", monicaBio), "planning text must not pass as a reflection");
console.log(`PASS_SUMMARY_WORDS=${words}`);
console.log(`PASS_CONN=${conn}`);
process.exit(0);
