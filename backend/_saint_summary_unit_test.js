// Unit check: direct summary/fallback helpers produce the committed contract.
// Run separately; these helpers currently share the same server module cache as
// earlier tests when run through `npm test`.
const assert = require("assert");
process.env.PORT = "3996";
process.env.OPENROUTER_API_KEY = "test";
const { compactSaintSummary, buildSaintConnectionFallback } = require("./server.js");
const story = [
  "Saint Jerome devoted many years to translating Scripture from Hebrew into Latin for Christians throughout the Church.",
  "Saint Augustine wrote of Jerome, What Jerome is ignorant of, no mortal has ever known.",
  "Jerome also wrote commentaries and letters that shaped Christian learning for generations after his death."
].join(" ");
const summary = compactSaintSummary(Array(20).fill(story).join(" "));
const words = summary.trim().split(/\s+/).length;
assert.ok(words >= 80 && words <= 210, `summary should be about half a long story, got ${words}`);
assert.ok(summary.includes("translating Scripture"), "summary keeps a defining early fact");
const conn = buildSaintConnectionFallback("Saint Jerome", story);
assert.ok(conn.includes("What Jerome is ignorant of"), "Jerome connection uses Augustine's direct quote");
assert.ok(conn.length <= 320, "connection remains card-sized");
console.log(`PASS_SUMMARY_WORDS=${words}`);
console.log(`PASS_CONN=${conn}`);
process.exit(0);
