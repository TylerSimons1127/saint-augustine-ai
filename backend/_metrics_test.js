// Verify metrics instrumentation. Self-contained: starts its own backend + stub on
// dedicated ports so `npm test` runs it cleanly with no external server.
const http = require("http");
const REASON = 'data: {"choices":[{"delta":{"reasoning":"Grace is the life of God within the soul."}}]}\n\n';
const REASON_END = "data: [DONE]\n\n";
const STUB_PORT = 5522;
const BACKEND_PORT = 5521;
const stub = http.createServer((req, res) => {
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
  if (r.body) { try { const rd = r.body.getReader(); while (!(await rd.read()).done) {} } catch (_) {} }
  return r.status;
}
async function healthz() {
  const r = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/healthz`);
  return r.json();
}

(async () => {
  process.env.PORT = String(BACKEND_PORT);
  process.env.OPENROUTER_API_KEY = "dummy";
  process.env.OPENROUTER_BASE_URL = `http://127.0.0.1:${STUB_PORT}`;
  await new Promise((res) => stub.listen(STUB_PORT, res));
  require("./server.js");
  await new Promise((r) => setTimeout(r, 300));

  const before = await healthz();
  const s1 = await postModel("nvidia/nemotron-3-ultra-550b-a55b:free");
  const s2 = await postModel("nvidia/nemotron-3-ultra-550b-a55b:free");
  const b1 = await postModel("openai/gpt-4o");
  const m1 = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/chat`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
  });
  if (m1.body) { try { const rd = m1.body.getReader(); while (!(await rd.read()).done) {} } catch (_) {} }

  await new Promise((r) => setTimeout(r, 200));
  const after = await healthz();

  console.log("before.chatRequests:", before.metrics?.chatRequests ?? "(none)");
  console.log("after.chatRequests:", after.metrics.chatRequests);
  console.log("after.byModel:", JSON.stringify(after.metrics.byModel));
  console.log("after.errors:", JSON.stringify(after.metrics.errors));

  const ok = after.metrics.chatRequests === 3 &&
    after.metrics.byModel["nvidia/nemotron-3-ultra-550b-a55b:free"].ok === 2 &&
    (after.metrics.errors["400"] === 1) &&
    s1 === 200 && s2 === 200 && b1 === 400 && m1.status === 400;
  console.log(ok ? "PASS (metrics instrumented)" : "FAIL");
  process.exit(ok ? 0 : 1);
})();
