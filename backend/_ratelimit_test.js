// Integration test: per-IP token-bucket rate limiter (cap 8, refill 1/7.5s).
// First 8 requests from ONE ip -> 200; 9th -> 429. A different ip is unaffected.
const http = require("http");
const REASON = "Grace is the life of God within the soul.";
const chunks = REASON.match(/[\s\S]{1,10}/g);
const STUB_PORT = 3988;
const BACKEND_PORT = 3987;

const stub = http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
  let i = 0; const t = setInterval(() => {
    if (i >= chunks.length) { clearInterval(t); res.end("data: [DONE]\n\n"); return; }
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { reasoning: chunks[i] } }] })}\n\n`); i++;
  }, 2);
});
stub.listen(STUB_PORT, async () => {
  process.env.PORT = String(BACKEND_PORT);
  process.env.OPENROUTER_API_KEY = "dummy";
  process.env.OPENROUTER_BASE_URL = `http://127.0.0.1:${STUB_PORT}`;
  require("./server.js");
  await new Promise((r) => setTimeout(r, 300));

  const base = `http://127.0.0.1:${BACKEND_PORT}/api/chat`;
  const MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";
  const makeReq = (ip) =>
    fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ model: MODEL, reasoning: "quick", stream: true, messages: [{ role: "user", content: "hi" }] }),
    });

  const drain = async (r) => { if (r.body) { try { const rd = r.body.getReader(); while (!(await rd.read()).done) {} } catch (_) {} } };

  // 8 requests from ONE ip -> all 200 (burst capacity)
  let okCount = 0;
  for (let i = 0; i < 8; i++) {
    const r = await makeReq("1.2.3.4");
    if (r.status === 200) okCount++;
    await drain(r);
  }
  // 9th from same ip -> 429 (bucket empty, refill not yet elapsed)
  const r9 = await makeReq("1.2.3.4");
  const r9status = r9.status;
  await drain(r9);
  // a DIFFERENT ip is not limited
  const other = await makeReq("9.9.9.9");
  const otherStatus = other.status;
  await drain(other);

  const pass = okCount === 8 && r9status === 429 && otherStatus === 200;
  console.log(`first8_200:${okCount}/8 | sameIP_9th:${r9status} | diffIP:${otherStatus}`);
  console.log(pass ? "PASS: token bucket allows burst of 8, then 429, different IP unaffected" : "FAIL");
  process.exit(pass ? 0 : 1);
});
