// Integration test for the Groq primary path and OpenRouter failover.
// Uses local HTTP stubs only; no external keys or provider requests.
const assert = require("assert/strict");
const http = require("http");
const net = require("net");

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}
function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => resolve(raw));
  });
}
function eventStream(events) {
  return events.map((event) => "data: " + JSON.stringify(event)).join("\n\n") + "\n\ndata: [DONE]\n\n";
}
let failGroq = false;
let groqRequest = null;
let openRouterCalls = 0;

const groq = http.createServer(async (req, res) => {
  if (req.url !== "/v1/chat/completions") {
    res.writeHead(404).end("not found");
    return;
  }
  groqRequest = JSON.parse(await readBody(req));
  if (failGroq) {
    res.writeHead(429, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message: "quota reached" } }));
    return;
  }
  res.writeHead(200, { "content-type": "text/event-stream" });
  res.end(eventStream([
    { choices: [{ delta: { reasoning: "PRIVATE REASONING" } }] },
    { choices: [{ delta: { content: "Peace be with you, friend. Grace is a quiet gift from God." } }] },
  ]));
});
const openrouter = http.createServer(async (req, res) => {
  if (req.url === "/models") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ data: [{ id: "nvidia/nemotron-3-ultra-550b-a55b:free", name: "Nemotron" }] }));
    return;
  }
  if (req.url === "/chat/completions") {
    openRouterCalls++;
    await readBody(req);
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(eventStream([{ choices: [{ delta: { content: "Friend, this backup answer still offers a clear response." } }] }]));
    return;
  }
  res.writeHead(404).end("not found");
});

(async () => {
  try {
    await Promise.all([listen(groq), listen(openrouter)]);
    const groqPort = groq.address().port;
    const openRouterPort = openrouter.address().port;
    const backendPort = await freePort();
    process.env.PORT = String(backendPort);
    process.env.GROQ_API_KEY = "test-only";
    process.env.GROQ_BASE_URL = "http://127.0.0.1:" + groqPort + "/v1";
    process.env.OPENROUTER_API_KEY = "test-only";
    process.env.OPENROUTER_BASE_URL = "http://127.0.0.1:" + openRouterPort;
    process.env.AWS_BEARER_TOKEN_BEDROCK = "";
    process.env.BEDROCK_API_KEY = "";
    require("./server.js");
    await new Promise((resolve) => setTimeout(resolve, 200));

    const modelsResponse = await fetch("http://127.0.0.1:" + backendPort + "/api/models");
    const models = await modelsResponse.json();
    assert.equal(models.models[0].id, "groq-primary");
    assert.equal(models.models[0].provider, "groq");
    assert.equal(models.models[0].primary, true);

    const url = "http://127.0.0.1:" + backendPort + "/api/chat";
    const payload = {
      model: "groq-primary",
      reasoning: "thoughtful",
      stream: true,
      messages: [{ role: "user", content: "Explain grace briefly." }],
    };
    const primaryResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const primaryText = await primaryResponse.text();
    assert.equal(primaryResponse.status, 200);
    assert.equal(primaryResponse.headers.get("x-provider-used"), "groq");
    assert.match(primaryText, /Grace is a quiet gift/);
    assert.doesNotMatch(primaryText, /PRIVATE REASONING/);
    assert.equal(groqRequest.model, "openai/gpt-oss-120b");
    assert.equal(groqRequest.stream, true);
    assert.equal(groqRequest.include_reasoning, false);
    assert.equal(groqRequest.max_completion_tokens > 0, true);
    assert.equal(Object.hasOwn(groqRequest, "max_tokens"), false);

    failGroq = true;
    const fallbackResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const fallbackText = await fallbackResponse.text();
    assert.equal(fallbackResponse.status, 200);
    assert.equal(fallbackResponse.headers.get("x-provider-used"), "openrouter");
    assert.match(fallbackText, /backup answer still offers a clear response/);
    assert.equal(openRouterCalls, 1);

    console.log("PASS: Groq model listing, supported streaming fields, hidden reasoning, and OpenRouter failover.");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
