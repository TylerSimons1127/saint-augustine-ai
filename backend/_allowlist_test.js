// Security test: model allowlist. A non-curated model must be rejected (400)
// BEFORE any OpenRouter call; a curated model must still stream.
const http = require("http");
const REASON = 'data: {"choices":[{"delta":{"reasoning":"Grace is the life of God within the soul."}}]}\n\n';
const REASON_END = "data: [DONE]\n\n";

let upstreamCalls = 0;
const stub = http.createServer((req, res) => {
  upstreamCalls++; // counts any time the backend actually forwards to "OpenRouter"
  res.setHeader("Content-Type", "text/event-stream");
  res.statusCode = 200;
  res.write(REASON);
  res.end(REASON_END);
});

async function postModel(m) {
  const r = await fetch("http://127.0.0.1:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: m, reasoning: "quick", stream: true, messages: [{ role: "user", content: "hi" }] }),
  });
  return r;
}

(async () => {
  await new Promise((res) => stub.listen(5332, res));
  await new Promise((r) => setTimeout(r, 200));

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
  console.log("GOOD_BODY>>>", JSON.stringify(goodBody.slice(0, 400)));
  console.log(badOk && goodOk ? "PASS (allowlist enforced; no upstream call for bad model)" : "FAIL");

  process.exit(badOk && goodOk ? 0 : 1);
})();
