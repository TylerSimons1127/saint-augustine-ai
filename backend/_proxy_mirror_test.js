// Unit test: proxyStream never exposes reasoning-only upstream data to clients.
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
  const hasReasoning = captured.includes('"reasoning"');
  const hasFinalEmpty = /data: \{\}\s*\n/.test(captured);
  const hasSafeRetry = captured.includes("I couldn’t form a reply this time. Please try again.");
  const ok = textEvents === 1 && !hasReasoning && hasSafeRetry && hasFinalEmpty;
  console.log("captured_len:", captured.length);
  console.log("text_events:", textEvents, "| reasoning_hidden:", !hasReasoning, "| safe_retry:", hasSafeRetry, "| final_{}:", hasFinalEmpty);
  console.log("=>", ok ? "PASS: reasoning stays private" : "FAIL");
  stub.close();
  process.exit(ok ? 0 : 1);
});
