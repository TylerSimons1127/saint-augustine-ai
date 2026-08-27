// Stub OpenRouter upstream: returns a reasoning-only SSE stream (the exact bug class).
// Reply is emitted entirely under delta.reasoning, nothing under delta.content,
// mimicking nvidia/nemotron-3-ultra-550b-a55b:free behaviour.
const http = require("http");
const FULL =
  "My son, you ask what grace is. Grace is the very hand of God reaching into our restless " +
  "heart — not a thing we seize, but a gift we receive. I wrote in the Confessions that God " +
  "made us for Himself, and our heart is restless until it rests in Him. So too with grace: it " +
  "is the rest He gives, the light by which we begin to love what we could not love by our own " +
  "strength. Pray, then, not that grace may be explained, but that it may be given.";
const PORT = 4099;
const chunks = FULL.match(/[\s\S]{1,12}/g);
http
  .createServer((req, res) => {
    if (req.url && req.url.startsWith("/api/models")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          models: [
            {
              id: "nvidia/nemotron-3-ultra-550b-a55b:free",
              name: "Nemotron 3 Ultra (free)",
              reason: "reasoning",
            },
          ],
        })
      );
      return;
    }
    if (req.url && req.url.replace(/\?.*$/, "") === "/models") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          data: [
            {
              id: "nvidia/nemotron-3-ultra-550b-a55b:free",
              pricing: { prompt: "0", completion: "0" },
            },
          ],
        })
      );
      return;
    }
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    let i = 0;
    const t = setInterval(() => {
      if (i >= chunks.length) {
        clearInterval(t);
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }
      res.write(
        `data: ${JSON.stringify({ choices: [{ delta: { reasoning: chunks[i] } }] })}\n\n`
      );
      i++;
    }, 60);
  })
  .listen(PORT, () => console.log(`stub reasoning-only on :${PORT}`));
