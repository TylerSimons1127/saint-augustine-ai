// Security test: model allowlist. Self-contained: starts its own backend + stub on
// dedicated ports so `npm test` runs it cleanly with no external server.
// A non-curated model must be rejected (400) BEFORE any upstream call; a curated
// model must still stream.
const http = require("http");
const REASON = 'data: {"choices":[{"delta":{"reasoning":"Grace is the life of God within the soul."}}]}\n\n';
const REASON_END = "data: [DONE]\n\n";

const STUB_PORT = 5333;     // simulates OpenRouter
const BACKEND_PORT = 5332;  // the backend under test
let upstreamCalls = 0;
const stub = http.createServer((req, res) => {
  upstreamCalls++; // counts any time the backend actually forwards to "OpenRouter"
  res.setHeader("Content-Type", "text/event-stream");
  res.statusCode = 200;
  res.write(REASON);
  res.end(REASON_END);
});

async function postModel(m) {
  const r = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: m, reasoning: "quick", stream: true, messages: [{ role: "user", content: "hi" }] }),
  });
  return r;
}

(async () => {
  process.env.PORT = String(BACKEND_PORT);
  process.env.OPENROUTER_API_KEY = "dummy";
  process.env.OPENROUTER_BASE_URL = `http://127.0.0.1:${STUB_PORT}`;
  await new Promise((res) => stub.listen(STUB_PORT, res));
  require("./server.js");
  await new Promise((r) => setTimeout(r, 300));

  // 1) non-allowlisted paid model -> must be 400, NO upstream call
  const before = upstreamCalls;
  const bad = await postModel("openai/gpt-4o");
  const badReached = upstreamCalls > before;

  // 2) curated free model -> stub streams it (200, has reasoning)
  const good = await postModel("nvidia/nemotron-3-ultra-550b-a55b:free");
  const dec = new TextDecoder();
  let goodBody = "";
  for await (const c of good.body) goodBody += dec.decode(c, { stream: true });

  const badOk = bad.status === 400 && !badReached;
  const goodOk = good.status === 200 && goodBody.includes("Grace is the life");
  console.log("bad_status:", bad.status, "| bad_reached_upstream:", badReached);
  console.log("good_status:", good.status);
  console.log(badOk && goodOk ? "PASS (allowlist enforced; no upstream call for bad model)" : "FAIL");
  process.exit(badOk && goodOk ? 0 : 1);
})();
