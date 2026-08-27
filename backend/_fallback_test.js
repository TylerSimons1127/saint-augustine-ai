// Integration test: chat fallback. Backend tries chosen model -> stub returns 404
// for it, then backend falls back through CURATED list -> stub streams reasoning-only
// for the 2nd curated model. We assert the browser would have received live {text}.
const http = require("http");

const REASON = "My child, grace is the very life of God poured into the soul.";
const chunks = REASON.match(/[\s\S]{1,10}/g);

// Stub upstream OpenRouter: 404 for ?x=dead, stream reasoning-only otherwise.
const stub = http.createServer((req, res) => {
  if (req.url.includes("deadmodel")) { res.writeHead(404); res.end("nope"); return; }
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
  let i = 0;
  const t = setInterval(() => {
    if (i >= chunks.length) { clearInterval(t); res.end("data: [DONE]\n\n"); return; }
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { reasoning: chunks[i] } }] })}\n\n`);
    i++;
  }, 3);
});
stub.listen(0, async () => {
  const port = stub.address().port;
  process.env.OPENROUTER_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.OPENROUTER_API_KEY = "dummy";
  process.env.PORT = "3999"; // backend listens here so we don't fight a running one

  // require backend (auto-listens on 3999)
  require("./server.js");

  // Give the server a moment to bind, then call /api/chat with a "deadmodel" id.
  await new Promise((r) => setTimeout(r, 400));

  let body = "";
  try {
    const upstream = await fetch("http://127.0.0.1:3999/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "vendor/deadmodel:free",
        reasoning: "quick",
        stream: true,
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    // read raw SSE text (with a safety timeout so we don't hang on keep-alive)
    const reader = upstream.body.getReader();
    const dec = new TextDecoder();
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const { done, value } = await reader.read();
      if (done) break;
      body += dec.decode(value, { stream: true });
    }
  } catch (e) {
    console.log("FETCH_ERR", e.name, e.message);
    process.exit(1);
  }

  const textEvents = (body.match(/"text":/g) || []).length;
  const done = body.includes("[DONE]") || body.includes("data: {}\n\n") || body.trim().endsWith("{}");
  const ok = textEvents > 0 && done;
  console.log("text_events:", textEvents, "| has_done:", done, "->", ok ? "PASS (fell back & streamed text)" : "FAIL");
  process.exit(ok ? 0 : 1);
});
