// Contract test: proves the REAL frontend request shape works end-to-end through
// the backend, parsed with the frontend's OWN SSE-parse logic (index.html ~L2092).
// If this passes, the deployed github.io frontend WILL get readable text from the
// backend (post-deploy). Self-contained: owns backend + a reasoning-only stub.
const http = require("http");
const STUB_PORT = 3988;
const BACKEND_PORT = 3987;

// Stub mirrors the real "reasoning-only" free model (nemotron-3-ultra): it emits
// reasoning channel is private; the model answer is streamed only under delta.content.
const OPENROUTER_SSE = [
  'data: {"choices":[{"delta":{"reasoning":"PRIVATE PLAN: reason silently."}}]}',
  'data: {"choices":[{"delta":{"content":"Grace is a gift from God that heals the soul."}}]}',
  "data: [DONE]",
].join("\n") + "\n";

const stub = http.createServer((req, res) => {
  if (req.url.startsWith("/models")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ data: [{ id: "nvidia/nemotron-3-ultra-550b-a55b:free", name: "N", created: 0 }] }));
    return;
  }
  res.writeHead(200, { "content-type": "text/event-stream" });
  res.end(OPENROUTER_SSE);
});

stub.listen(STUB_PORT, async () => {
  process.env.PORT = String(BACKEND_PORT);
  process.env.OPENROUTER_API_KEY = "dummy";
  process.env.OPENROUTER_BASE_URL = `http://127.0.0.1:${STUB_PORT}`;
  require("./server.js");
  await new Promise((r) => setTimeout(r, 300));

  // Exact payload the frontend sends (index.html L2087).
  const payload = {
    model: "nvidia/nemotron-3-ultra-550b-a55b:free",
    reasoning: "contemplative",
    stream: true,
    messages: [{ role: "user", content: "What is grace?" }],
  };

  const resp = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // Frontend's own SSE parse logic, reproduced here.
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "", sawEmpty = false;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line || !line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "{}" || data === "[DONE]") { if (data === "{}") sawEmpty = true; continue; }
      try {
        const j = JSON.parse(data);
        if (j.text) text += j.text;
      } catch (_) {}
    }
  }

  const pass = resp.status === 200 && text.trim().length > 0 && !text.includes("PRIVATE PLAN") && sawEmpty;
  console.log(`status:${resp.status} textLen:${text.trim().length} sawEmptyFinal:${sawEmpty}`);
  console.log(`text="${text.trim()}"`);
  console.log(pass ? "PASS (frontend request shape -> readable text via backend SSE)" : "FAIL");
  process.exit(pass ? 0 : 1);
});
