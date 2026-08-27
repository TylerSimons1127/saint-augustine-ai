// Integration test: per-IP rate limiter. Streams come from the stub, so we just
// count status codes. 31 requests from ONE spoofed IP -> the 31st returns 429.
const http = require("http");
const REASON = "Grace is the life of God poured into the soul.";
const chunks = REASON.match(/[\s\S]{1,10}/g);

const stub = http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
  let i = 0; const t = setInterval(() => {
    if (i >= chunks.length) { clearInterval(t); res.end("data: [DONE]\n\n"); return; }
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { reasoning: chunks[i] } }] })}\n\n`); i++;
  }, 2);
});
stub.listen(0, async () => {
  const port = stub.address().port;
  process.env.OPENROUTER_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.OPENROUTER_API_KEY = "dummy";
  process.env.PORT = "3998";
  require("./server.js");
  await new Promise((r) => setTimeout(r, 400));

  const base = "http://127.0.0.1:3998/api/chat";
  const makeReq = (ip) =>
    fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ model: "x", reasoning: "quick", stream: true, messages: [{ role: "user", content: "hi" }] }),
    });

  // 30 requests from ONE ip -> all 200
  let okCount = 0;
  for (let i = 0; i < 30; i++) {
    const r = await makeReq("1.2.3.4");
    if (r.status === 200) okCount++;
    // drain body so the server doesn't wedge
    const rd = r.body.getReader();
    while (!(await rd.read()).done) {}
  }
  // 31st from same ip -> 429
  const r31 = await makeReq("1.2.3.4");
  const r31status = r31.status;
  // a DIFFERENT ip is not limited
  const other = await makeReq("9.9.9.9");
  const otherStatus = other.status;
  const rd31 = r31.body ? r31.body.getReader() : null; if (rd31) while (!(await rd31.read()).done) {}
  const othRd = other.body ? other.body.getReader() : null; if (othRd) while (!(await othRd.read()).done) {}

  const pass = okCount === 30 && r31status === 429 && otherStatus === 200;
  console.log(`first30_200:${okCount}/30 | sameIP_31st:${r31status} | diffIP:${otherStatus}`);
  console.log(pass ? "PASS: rate limiter caps per-IP at 30/min, different IP unaffected" : "FAIL");
  process.exit(pass ? 0 : 1);
});
