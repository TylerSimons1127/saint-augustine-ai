// Functional test of proxyStream WITHOUT the real OpenRouter key.
const fs = require("fs");
const path = require("path");

// Load the REAL server.js in a sandbox. We stub fetch so module-load side effects
// never touch the network, then export proxyStream via an appended line.
const realPath = path.join(__dirname, "server.js");
let src = fs.readFileSync(realPath, "utf8").replace(/\r\n/g, "\n");
const tmp = path.join(__dirname, "._server_under_test.js");
fs.writeFileSync(tmp, src + "\nmodule.exports = { proxyStream };\n");

global.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
const { proxyStream } = require(tmp);

function makeReasoningOnlyUpstream(tokens) {
  const lines = tokens.map(t => `data: ${JSON.stringify({ choices: [{ delta: { reasoning: t } }] })}`).join("\n");
  const body = lines + "\ndata: [DONE]\n";
  const chunks = [];
  for (let i = 0; i < body.length; i += 40) chunks.push(Buffer.from(body.slice(i, i + 40)));
  return { ok: true, body: (async function* () { for (const c of chunks) yield c; })() };
}
function makeDualUpstream(reasoningTokens, contentTokens) {
  const parts = [];
  for (const t of reasoningTokens) parts.push(`data: ${JSON.stringify({ choices: [{ delta: { reasoning: t } }] })}`);
  for (const t of contentTokens) parts.push(`data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}`);
  const body = parts.join("\n") + "\ndata: [DONE]\n";
  const chunks = [];
  for (let i = 0; i < body.length; i += 40) chunks.push(Buffer.from(body.slice(i, i + 40)));
  return { ok: true, body: (async function* () { for (const c of chunks) yield c; })() };
}
function captureRes() {
  let out = "";
  const res = { write(s) { out += s; return true; }, end() {}, writeHead() {} };
  return { res, get: () => out };
}
function parseEvents(raw) {
  const evs = [];
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const d = line.slice(5).trim();
    if (d === "[DONE]" || d === "{}") { evs.push("DONE"); continue; }
    try { evs.push(JSON.parse(d)); } catch { evs.push("UNPARSEABLE"); }
  }
  return evs;
}
function countText(evs) {
  let text = "", reasoning = 0, reasoningNull = 0, liveText = 0;
  for (const e of evs) {
    if (e === "DONE" || typeof e !== "object") continue;
    if (typeof e.text === "string") { text += e.text; liveText++; }
    if (typeof e.reasoning === "string") reasoning++;
    if (e.reasoning === null) reasoningNull++;
  }
  return { textLen: text.length, text, reasoningEvents: reasoning, reasoningNull, liveText };
}

(async () => {
  let pass = true;
  // TEST A: reasoning-only model -> MUST stream live text (the bug we fixed)
  {
    const pieces = [];
    const big = "Augustine would say that grace is the free gift of God. ";
    for (let i = 0; i < 40; i++) pieces.push(big);
    const { res, get } = captureRes();
    await proxyStream(makeReasoningOnlyUpstream(pieces), res);
    const evs = parseEvents(get());
    const r = countText(evs);
    console.log(`[A reasoning-only] textLen=${r.textLen} liveTextEvents=${r.liveText} reasoningTrace=${r.reasoningEvents} collapsed=${r.reasoningNull}`);
    if (r.textLen < 1000) { console.log("  FAIL: no live text emitted"); pass = false; }
    if (r.liveText < 5) { console.log("  FAIL: text not streamed live (empty bubble then dump)"); pass = false; }
    if (r.reasoningNull === 0) { console.log("  WARN: trace box not collapsed before mirror"); }
  }
  // TEST B: dual-stream model -> content is visible text, reasoning in box
  {
    const { res, get } = captureRes();
    await proxyStream(makeDualUpstream(
      ["Let me think...", "Grace is unmerited.", "I will answer now."],
      ["Grace, my child,", " is the unmerited gift", " of God himself."]
    ), res);
    const evs = parseEvents(get());
    const r = countText(evs);
    console.log(`[B dual-stream] text="${r.text}" reasoningEvents=${r.reasoningEvents} reasoningNull=${r.reasoningNull}`);
    if (r.text !== "Grace, my child, is the unmerited gift of God himself.") { console.log("  FAIL: content not forwarded as text"); pass = false; }
    if (r.reasoningEvents !== 3) { console.log("  FAIL: reasoning trace missing"); pass = false; }
    if (r.reasoningNull !== 0) { console.log("  WARN: dual model should not collapse trace"); }
  }
  fs.unlinkSync(tmp);
  console.log(pass ? "\nALL STREAM TESTS PASS" : "\nSTREAM TESTS FAILED");
  process.exit(pass ? 0 : 1);
})();
