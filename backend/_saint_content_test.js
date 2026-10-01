// Regression test: /api/saint must use the complete story for both AI outputs.
const assert = require("assert");
const nativeFetch = global.fetch;
const requests = [];
const longBio = Array.from({ length: 5 }, (_, i) =>
  `<p>${i === 0 ? "Saint Testa entered a religious community and devoted her life to prayer and service, forming a steady vocation of quiet generosity." : i === 1 ? "She taught children and cared for families who had little support, giving practical help to people in her neighborhood." : i === 2 ? "Her daily work was shaped by a deep trust in God and a commitment to ordinary acts of charity, patience, and humility." : i === 3 ? "People remembered her gentle presence and the care she showed to those around her, especially those who were often overlooked." : "FULL_STORY_END_MARKER: she founded a school for orphaned children and helped create lasting opportunities for their education."}</p>`
).join("");
const listing = `<a class="elementor-post__thumbnail__link" href="https://www.franciscanmedia.org/saint-of-the-day/test-saint/"><img src="https://example.test/saint.jpg"></a><div class="elementor-post__title"><a href="https://www.franciscanmedia.org/saint-of-the-day/test-saint/">St. Testa</a></div><div class="elementor-post__excerpt"><p>A short teaser that must not become the summary.</p></div><div class="elementor-post-date">May 1</div>`;
const detail = `<h3>Testa’s Story</h3>${longBio}<h2>Reflection</h2><p>Not part of the biography.</p>`;

global.fetch = async (url, opts = {}) => {
  const target = String(url);
  if (target.includes("/saint-of-the-day/") && !target.includes("/test-saint/"))
    return new Response(listing, { status: 200 });
  if (target.includes("/test-saint/"))
    return new Response(detail, { status: 200 });
  if (target.includes("/chat/completions")) {
    const body = JSON.parse(opts.body);
    requests.push(body);
    const isSummary = body.messages[0].content.includes("COMPLETE source story");
    const content = isSummary
      ? "The user wants a concise biography summary of Saint Testa based on the provided source story. I need to write 3-5 clear sentences, 160-210 words, in accessible language. Let me analyze the source story for key facts: she entered a religious community, taught children, and founded a school. I need to craft a polished summary now."
      : "I recognize in your care for the forgotten a call to serve Christ in each neighbor. Your school for orphaned children gives that shared love a distinct and lasting form.";
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200, headers: { "content-type": "application/json" } });
  }
  return nativeFetch(url, opts);
};

process.env.PORT = "3994";
process.env.OPENROUTER_BASE_URL = "https://mock-openrouter.invalid/api/v1";
process.env.OPENROUTER_API_KEY = "test";
require("./server.js");

(async () => {
  await new Promise((resolve) => setTimeout(resolve, 80));
  const response = await nativeFetch("http://127.0.0.1:3994/api/saint");
  assert.strictEqual(response.status, 200);
  const saint = await response.json();
  assert.strictEqual(saint.name, "St. Testa");
  assert.ok(saint.bio.includes("founded a school for orphaned children"), "AI summary should include a defining fact from the full story");
  assert.ok(!/the user wants|let me analyze|i need to write/i.test(saint.bio), "model planning text must never be returned as the saint summary");
  assert.ok(!saint.bio.includes("short teaser"), "AI summary must replace the card excerpt");
  assert.ok(saint.conn.includes("school for orphaned children"), "Augustine reflection should use a saint-specific fact");
  assert.strictEqual(requests.length, 2, "expect separate summary and connection generations");
  for (const req of requests) {
    const prompt = req.messages.map((m) => m.content).join("\n");
    assert.ok(prompt.includes("FULL_STORY_END_MARKER"), "both generations must receive the complete story, including its final paragraph");
  }
  assert.ok(requests[0].messages[0].content.includes("160-210 words"), "summary prompt should target about half of the current 409-word story");
  const summaryWords = saint.bio.trim().split(/\s+/).filter(Boolean).length;
  assert.ok(summaryWords >= 80 && summaryWords <= 210, `summary should be a substantive source-based biography of at most 210 words, got ${summaryWords}`);
  assert.ok(requests[1].messages[0].content.includes("name-swapped"), "connection prompt must forbid generic name-swapped copy");
  console.log("PASS: full-story summary + saint-specific Augustine reflection");
  process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
