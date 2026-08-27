// Test: /api/feedback accepts POSTs (capped reasons), rejects bad input, and
// GET returns recent entries. Self-contained: owns its backend + a no-op stub.
const http = require("http");
const STUB_PORT = 3977;
const BACKEND_PORT = 3976;
const stub = http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/event-stream" });
  res.end("data: [DONE]\n\n");
});
stub.listen(STUB_PORT, async () => {
  process.env.PORT = String(BACKEND_PORT);
  process.env.OPENROUTER_API_KEY = "dummy";
  process.env.OPENROUTER_BASE_URL = `http://127.0.0.1:${STUB_PORT}`;
  require("./server.js");
  await new Promise((r) => setTimeout(r, 300));
  const base = `http://127.0.0.1:${BACKEND_PORT}/api/feedback`;

  // bad input -> 400
  const bad = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: "notjson" });
  // valid submit
  const ok1 = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "unfaithful", detail: "cited a non-existent encyclical", model: "nvidia/nemotron-3-ultra-550b-a55b:free" }) });
  // reason normalized to "other" if unknown
  const ok2 = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "weird", detail: "x" }) });
  // GET summary
  const get = await fetch(base);
  const getJson = await get.json();

  const pass = bad.status === 400 && ok1.status === 200 && ok2.status === 200 &&
    getJson.count === 2 && getJson.recent[0].reason === "other" && getJson.recent[1].reason === "unfaithful";
  console.log(`bad:${bad.status} ok1:${ok1.status} ok2:${ok2.status} count:${getJson.count} recent[0].reason:${getJson.recent[0].reason}`);
  console.log(pass ? "PASS (feedback route works, reason normalized)" : "FAIL");
  process.exit(pass ? 0 : 1);
});
