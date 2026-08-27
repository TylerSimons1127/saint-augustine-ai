// Unit test: proxyStream mirrors a SHORT reasoning-only upstream (below the
// MIRROR_THRESHOLD) into a final {text} event at stream end. Proves the
// fallback end-of-stream path emits visible text even for tiny answers.
const http = require("http");
const { proxyStream } = require("./server.js");

const REASON = "My child, grace is the life of God.";
const chunks = REASON.match(/[\s\S]{1,8}/g);

const stub = http.createServer((req, res) => {
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
  const upstream = await fetch(`http://127.0.0.1:${port}/chat`);
  let captured = "";
  const fakeRes = {
    write: (s) => { captured += s; return true; },
    end: () => {},
  };
  await proxyStream(upstream, fakeRes);
  const textEvents = (captured.match(/"text":/g) || []).length;
  const hasReasonNull = captured.includes('"reasoning":null');
  const hasFinalEmpty = /data: \{\}\s*\n/.test(captured);
  const ok = textEvents >= 1 && hasReasonNull && hasFinalEmpty;
  console.log("captured_len:", captured.length);
  console.log("text_events:", textEvents, "| reason_null:", hasReasonNull, "| final_{}:", hasFinalEmpty);
  console.log("=>", ok ? "PASS: short reasoning mirrored to visible text" : "FAIL");
  stub.close();
  process.exit(ok ? 0 : 1);
});
