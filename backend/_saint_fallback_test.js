// Regression test: model failure must not produce a full biography or a missing connection.
const assert = require("assert");
const nativeFetch = global.fetch;
const slug = "test-jerome";
const listing = `<a class="elementor-post__thumbnail__link" href="https://www.franciscanmedia.org/saint-of-the-day/${slug}/"><img src="https://example.test/jerome.jpg"></a><div class="elementor-post__title"><a href="https://www.franciscanmedia.org/saint-of-the-day/${slug}/">Saint Jerome</a></div><div class="elementor-post__excerpt"><p>A short teaser about Jerome.</p></div><div class="elementor-post-date">September 30</div>`;
const detail = `<h3>Jerome's Story</h3>
<p>Saint Jerome devoted many years to translating Scripture from Hebrew into Latin for Christians throughout the Church.</p>
<p>Augustine wrote to Jerome seeking his help with a difficult question about the soul.</p>
<p>Jerome also wrote commentaries and letters that shaped Christian learning for generations after his death.</p>
<p>He prepared carefully through years of study in Latin, Greek, Hebrew, and other languages before undertaking his work.</p>
<p>His boldness sometimes brought conflict, yet it also defended Christian teaching with unusual energy and deep commitment.</p>
<p>Jerome balanced study with prayer, penance, humble learning, and persistent service to the Church through every stage.</p>
<p>The Vulgate gave ordinary believers long access to Scripture and shaped Christian learning for many later generations.</p>
<p>His story joins fierce scholarship, repentance, and practical usefulness to the Church through the work of words.</p>
<p>Augustine's surviving letters show that he valued Jerome's scriptural learning and sought his counsel.</p>
<p>Jerome's discipline shows grace works through temperament and labor, shaping scholarship into service and love.</p>
<h2>Reflection</h2><p>This material is outside the saint biography and must not be included.</p>`;

global.fetch = async (url, opts = {}) => {
  const target = String(url);
  if (target === "https://www.franciscanmedia.org/saint-of-the-day/") return new Response(listing, { status: 200 });
  if (target.includes(`/${slug}/`)) return new Response(detail, { status: 200 });
  if (target.includes("/chat/completions"))
    return new Response(JSON.stringify({ choices: [{ message: { content: "" } }] }), { status: 200, headers: { "content-type": "application/json" } });
  return nativeFetch(url, opts);
};

process.env.PORT = "3995";
process.env.OPENROUTER_BASE_URL = "https://mock-openrouter.invalid/api/v1";
process.env.OPENROUTER_API_KEY = "test";
require("./server.js");

(async () => {
  await new Promise((resolve) => setTimeout(resolve, 80));
  const response = await nativeFetch("http://127.0.0.1:3995/api/saint");
  assert.strictEqual(response.status, 200);
  const saint = await response.json();
  const words = (saint.bio || "").trim().split(/\s+/).filter(Boolean).length;
  assert.ok(words >= 160 && words <= 210, `Jerome summary should contain 160-210 words, got ${words}`);
  const sentences = (saint.bio.match(/[^.!?]+[.!?]+/g) || []).length;
  assert.ok(sentences >= 3 && sentences <= 5, `Jerome summary should contain 3-5 sentences, got ${sentences}`);
  assert.ok(saint.bio.includes("translating Scripture") || saint.bio.includes("commentaries"), "fallback should preserve a defining story detail");
  assert.ok(saint.conn, "reflection should never be absent when the story includes source material");
  assert.ok(saint.conn.includes("Augustine") && saint.conn.includes("Jerome"), "reflection must connect today's saint specifically to Augustine");
  assert.ok(saint.conn.includes("Letter 166"), "reflection should use Augustine's primary correspondence with Jerome");
  console.log("PASS: concise full-story fallback + source-grounded Jerome connection");
  process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
