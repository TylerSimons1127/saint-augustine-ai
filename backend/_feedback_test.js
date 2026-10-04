// Test: /api/feedback accepts anonymous category-only POSTs, rejects bad input,
// and exposes neither feedback details nor diagnostics. Self-contained.
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
  // valid category-only submit; hostile detail fields must not be retained or echoed
  const ok1 = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "citation_issue", detail: "private text that must not be stored", snippet: "entire answer" }) });
  // unknown reason normalizes to other
  const ok2 = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "weird", detail: "x" }) });
  // details and operational metrics have no public GET endpoint
  const get = await fetch(base);
  const health = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/healthz`);
  const healthJson = await health.json();
  const getText = await get.text();

  const pass = bad.status === 400 && ok1.status === 202 && ok2.status === 202 &&
    get.status === 405 && !getText.includes("private text") && healthJson.ok === true &&
    Object.keys(healthJson).join(",") === "ok";
  console.log(`bad:${bad.status} ok1:${ok1.status} ok2:${ok2.status} public-get:${get.status} health:${JSON.stringify(healthJson)}`);
  console.log(pass ? "PASS (category-only feedback and minimal health)" : "FAIL");
  process.exit(pass ? 0 : 1);
});
