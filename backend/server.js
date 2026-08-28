// SaintAugustineAI — backend
// Zero-dependency Node HTTP server. Holds the OpenRouter API key SERVER-SIDE
// (never in the public frontend) and proxies model listing + chat streaming.
//
// Env:
//   OPENROUTER_API_KEY  (required)  — your OpenRouter key
//   PORT                 (default 3000)
//   SYSPROMPT_CACHE_MS   (default 120000) — how long to cache the free-models list
//
// Routes:
//   GET  /api/health   -> { ok:true }
//   GET  /api/models   -> { models: [ {id,name,desc,context} ] }  (OpenRouter :free models)
//   POST /api/chat     -> SSE stream of assistant tokens (JSON bodies in, ndjson out)

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const MODELS_CACHE_MS = Number(process.env.SYSPROMPT_CACHE_MS) || 120000;

// ---- loads the Catholic/Augustine persona once at boot ----
let SYSTEM_PROMPT = "You are Augustine, a faithful Catholic companion.";
const sysPath = path.join(__dirname, "system-prompt.txt");
try {
  SYSTEM_PROMPT = fs.readFileSync(sysPath, "utf8").trim();
} catch (e) {
  console.warn("system-prompt.txt not found; using default persona.");
}

// ---- tiny JSON helpers ----
function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(new Error("payload too large")); req.destroy(); return; }
      data += c;
    });
    req.on("end", () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(new Error("invalid JSON")); } });
    req.on("error", reject);
  });
}
function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  });
  res.end(body);
}
function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// Hard timeout on outbound calls so a hung upstream (common on free model tiers)
// can't wedge the request forever. Without this, a slow OpenRouter chat can hang
// the connection until the provider itself closes — the "contemplative times out"
// symptom. AbortController gives us a clean, user-facing failure instead.
async function fetchWithTimeout(url, options = {}, ms = 30000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ---- per-IP rate limiter (protects the free OpenRouter key) ----
// Token-bucket limiter: capacity 8, refills 8 per 60s. A burst of up to 8 is
// allowed; after that requests are spaced to ~7.5s apart. This still bounds
// free-tier key burn from a flood/scraped endpoint, but a legitimate user who
// sends a few messages then pauses is never locked out for a full minute.
const RATE_CAP = 8;            // max tokens (burst size)
const RATE_REFILL_MS = 60_000 / 8; // one token every 7.5s
const rateBuckets = new Map();
function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}
function rateLimited(ip) {
  const now = Date.now();
  let b = rateBuckets.get(ip);
  if (!b) {
    b = { tokens: RATE_CAP - 1, ts: now };
    rateBuckets.set(ip, b);
    return false;
  }
  // refill
  const elapsed = now - b.ts;
  b.tokens = Math.min(RATE_CAP, b.tokens + elapsed / RATE_REFILL_MS);
  b.ts = now;
  if (b.tokens < 1) return true; // not enough tokens -> limited
  b.tokens -= 1;
  // periodic sweep so the Map doesn't grow unbounded
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) if (now - v.ts > 120_000) rateBuckets.delete(k);
  }
  return false;
}

// ---- in-memory metrics (no disk; resets on deploy) ----
const metrics = {
  chatRequests: 0,
  byModel: Object.create(null),
  errors: Object.create(null),
  rateLimited: 0,
  startedAt: Date.now(),
};

// ---- user feedback (in-memory ring buffer; no disk) ----
// Lets users flag a reply (unfaithful / off-topic / other). Capped so a flood
// can't grow memory; we keep the most recent 200 entries. Exposed read-only via
// /api/healthz for ops. Resets on deploy (acceptable for a free-tier MVP).
const FEEDBACK_CAP = 200;
const feedback = [];
function addFeedback(entry) {
  feedback.push({
    ts: Date.now(),
    reason: ["unfaithful", "off-topic", "other"].includes(entry.reason) ? entry.reason : "other",
    detail: String(entry.detail || "").slice(0, 500),
    model: String(entry.model || "").slice(0, 120),
  });
  if (feedback.length > FEEDBACK_CAP) feedback.splice(0, feedback.length - FEEDBACK_CAP);
}
function recordChat(model, outcome) {
  metrics.chatRequests++;
  const b = metrics.byModel[model] || (metrics.byModel[model] = { ok: 0, err: 0, fallback: 0 });
  b[outcome]++;
}
function recordError(status) { metrics.errors[status] = (metrics.errors[status] || 0) + 1; }

// ---- free-models cache ----
let modelsCache = { at: 0, data: null };

// Curated "recommended" free models — chosen for reasoned prose, strong instruction
// following, and (as far as free tiers allow) faithful Catholic tone. Sorted first in
// the picker so the best default isn't buried among dozens of free options.
const CURATED = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "z-ai/glm-5.2:free",
  "google/gemma-4-31b-it:free",
  "minimax/minimax-m3:free",
  "google/gemma-4-26b-a4b-it:free",
];
const CURATED_ORDER = new Map(CURATED.map((id, i) => [id, i]));

async function getFreeModels() {
  if (modelsCache.data && Date.now() - modelsCache.at < MODELS_CACHE_MS) return modelsCache.data;
  const res = await fetchWithTimeout(`${OPENROUTER}/models`, { headers: { Authorization: `Bearer ${KEY}` } }, 15000);
  if (!res.ok) throw new Error(`OpenRouter models ${res.status}`);
  const json = await res.json();
  const list = (json.data || [])
    .filter((m) => m.id.includes(":free") && m.pricing && m.pricing.prompt === "0" && m.pricing.completion === "0")
    .map((m) => ({
      id: m.id,
      name: prettyName(m.id),
      desc: (m.description || "").replace(/\s+/g, " ").trim().slice(0, 120),
      context: m.context_length || null,
      featured: CURATED.includes(m.id) ? true : undefined,
    }))
    .sort((a, b) => {
      const af = CURATED_ORDER.has(a.id), bf = CURATED_ORDER.has(b.id);
      if (af && bf) return CURATED_ORDER.get(a.id) - CURATED_ORDER.get(b.id);
      if (af !== bf) return af ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  modelsCache = { at: Date.now(), data: list };
  return list;
}
// "nvidia/nemotron-3-super-120b-a12b:free" -> "Nemotron 3 Super 120B a12b"
function prettyName(id) {
  const base = id.replace(/:free$/, "");
  const parts = base.split("/");
  const org = parts[0] || "";
  const slug = parts[parts.length - 1] || base;
  const name = slug
    .split("-")
    .map((w) => (w.replace(/^\d/, "") ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
  return `${name} · ${org}`;
}

// ---- chat proxy (streams SSE) ----
function friendlyError(status) {
  if (status === 401) return "The backend's OpenRouter key is missing or invalid. Add OPENROUTER_API_KEY.";
  if (status === 429) return "That model is temporarily rate-limited (free tier). Pick another or retry shortly.";
  if (status === 402) return "The OpenRouter account has no credits (free-tiers exhausted or restricted).";
  if (status >= 500) return `The model provider reported an error (${status}). Try a different free model.`;
  if (status === 404) return `That model isn't available (${status}). Try a different free model.`;
  return `OpenRouter returned ${status}.`;
}

async function handleChat(req, res, body) {
  const { model, messages, reasoning, stream } = body;
  if (!model) return sendJson(res, 400, { error: "Missing 'model'." });
  // Lock the requested model to the curated free-tier allowlist. The API is
  // public, so without this anyone could proxy paid models through our key.
  if (!CURATED.includes(model)) {
    recordChat(model, "err");
    recordError(400);
    return sendJson(res, 400, { error: "That model is not on the available list. Choose one of the offered models." });
  }
  if (!Array.isArray(messages) || messages.length === 0)
    return sendJson(res, 400, { error: "Missing 'messages'." });

  const sys = { role: "system", content: SYSTEM_PROMPT };
  const history = messages.slice(-24).map(sanitize); // keep a bounded window

  // Reasoning depth -> genuinely changes length + depth of the reply.
  // We inject a depth instruction into the system message AND tune the
  // generation params, because temperature alone does not control length.
  let depthNote = "";
  let maxTokens = 1024;
  let temperature = 0.7;
  if (reasoning === "quick") {
    temperature = 0.85;
    maxTokens = 320;
    depthNote =
      "ANSWER MODE — QUICK: Keep this answer short, direct, and easy to read. " +
      "Two or three sentences is enough. Give the gist, skip the deep exposition, " +
      "no 'Sources:' line, no long prayer. If a TLDR would help, it is not needed because the answer is already brief.";
  } else if (reasoning === "contemplative") {
    temperature = 0.4;
    maxTokens = 2048; // bounded so slow free models finish under the 110s fetch ceiling
    depthNote =
      "ANSWER MODE — CONTEMPLATIVE (maximum depth, maximum length): I ask of you my own " +
  "best self — be fully unhurried and give the deepest answer you can, as long as it " +
  "deserves. Do not brief or truncate. Walk through the what, the why, and the depth " +
  "beneath the why. Draw on Scripture, the Church Fathers (above all my own Confessions, " +
  "homilies, and letters), Aquinas, and the Catechism. Weave in first-person insight " +
  "from my restless years if it serves the soul before you. Let each point breathe; write " +
  "in flowing paragraphs of real depth, not bullet lists. Aim to be genuinely thorough — " +
  "extensive, unhurried, richly detailed — until the thought is complete. " +
  "IMPORTANT: remain Augustine, in first person, the whole way through — never drop " +
  "character, never switch to a neutral or encyclopedic voice, never ramble in circles. " +
  "Because this answer is long, land a complete, coherent close: end with a single short " +
  "'TLDR:' line, and when it fits, a brief prayer. Do not stop mid-thought; if you sense " +
  "you are near the limit, finish the current paragraph and close well rather than trail off.";
  } // thoughtful = neutral default (already set above)

  const sysAugmented = depthNote
    ? { role: "system", content: SYSTEM_PROMPT + "\n\n" + depthNote }
    : sys;

  const payloadBase = {
    stream: stream !== false,
    messages: [sysAugmented, ...history],
    max_tokens: maxTokens,
    temperature,
  };

  // Retry order: the user's chosen model first, then the rest of the curated
  // list. Free models vanish or get rate-limited without warning; failing over
  // to another curated model keeps the chat alive instead of 404-ing the user.
  const ordered = [model];
  for (const c of CURATED) if (c !== model) ordered.push(c);

  let lastErr = { status: 502, error: "Could not reach OpenRouter.", detail: "" };
  for (const cand of ordered) {
    let upstream;
    try {
      upstream = await fetchWithTimeout(`${OPENROUTER}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ ...payloadBase, model: cand }),
      }, 110000);
    } catch (e) {
      if (e.name === "AbortError") {
        lastErr = { status: 504, error: "The model took too long to respond (free tier may be saturated). Try again, choose a different model, or use 'Quick' mode.", detail: "" };
        if (cand !== model) metrics.byModel[model] = metrics.byModel[model] || { ok: 0, err: 0, fallback: 0 }, metrics.byModel[model].fallback++;
        continue;
      }
      lastErr = { status: 502, error: "Could not reach OpenRouter.", detail: "" };
      if (cand !== model) metrics.byModel[model] = metrics.byModel[model] || { ok: 0, err: 0, fallback: 0 }, metrics.byModel[model].fallback++;
      continue;
    }

    if (!upstream.ok) {
      let detail = "";
      try { detail = (await upstream.json()).error?.message || ""; } catch (_) {}
      lastErr = { status: upstream.status, error: friendlyError(upstream.status), detail };
      if (cand !== model) metrics.byModel[model] = metrics.byModel[model] || { ok: 0, err: 0, fallback: 0 }, metrics.byModel[model].fallback++;
      continue;
    }

    // Success on this candidate.
    if (!payloadBase.stream) {
      const json = await upstream.json();
      return sendJson(res, 200, {
        content: json.choices?.[0]?.message?.content || "",
        model: json.model,
      });
      // (non-stream success path — count handled below via stream branch)
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
    });
    await proxyStream(upstream, res);
    recordChat(cand, "ok");
    return;
  }

  // Every candidate failed.
  recordChat(model, "err");
  recordError(lastErr.status);
  return sendJson(res, lastErr.status, { error: lastErr.error, detail: lastErr.detail });
}

/* ---- SSE proxy: OpenRouter upstream -> browser ----
 * Contract: each upstream SSE `data:` JSON carries a `choices[0].delta`.
 * - delta.content -> forwarded live as {text}  (visible reply)
 * - delta.reasoning / delta.thinking -> forwarded live as {reasoning} (Thinking box)
 * Some free "reasoning" models emit their ENTIRE answer under `reasoning` and
 * nothing under `content` (e.g. nvidia/nemotron-3-ultra). For those we must
 * surface the reasoning stream as the visible answer in real time, or the user
 * stares at an empty bubble until a 40s late dump. So:
 *   - Always forward reasoning as {reasoning} (client hides it in a box).
 *   - If NO content has arrived by the time the stream ends, re-emit the
 *     accumulated reasoning as live {text} tokens (visible). But to avoid a
 *     jarring end-dump, we ALSO begin mirroring reasoning->text live once it's
 *     clear this is a reasoning-only model (threshold reached with no content).
 */
async function proxyStream(upstream, res) {
  let sawContent = false;
  let sawReasoning = false;
  let reasonAcc = "";
  let mirrored = false;                       // reasoning-only model: mirroring to text
  const MIRROR_THRESHOLD = 600;              // chars of reasoning w/ no content yet
  const REASON_TRACE_MAX = 2400;             // cap what we reveal in the Thinking box
  const REASON_TEXT_MAX = 14000;             // safety cap on mirrored visible text
  const decoder = new TextDecoder();
  let lineBuf = "";

  const flush = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  for await (const chunk of upstream.body) {
    const text = decoder.decode(chunk, { stream: true })
      .split(String.fromCharCode(13)).join(String.fromCharCode(10));
    lineBuf += text;

    // process complete lines; keep any trailing partial line in the buffer
    let nl;
    while ((nl = lineBuf.indexOf("\n")) >= 0) {
      const line = lineBuf.slice(0, nl);
      lineBuf = lineBuf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") { flush({}); continue; }
      let j;
      try { j = JSON.parse(data); } catch (_) { continue; }
      const delta = j.choices?.[0]?.delta;
      if (!delta) continue;
      const th = delta.reasoning ?? delta.thinking ?? null;
      const tok = delta.content ?? "";
      if (tok) {
        sawContent = true;
        flush({ text: tok });
      }
      if (th) {
        sawReasoning = true;
        reasonAcc += th;
        if (reasonAcc.length <= REASON_TRACE_MAX) flush({ reasoning: th });
        if (!sawContent && !mirrored && reasonAcc.length >= MIRROR_THRESHOLD) {
          mirrored = true;
          flush({ reasoning: null });
        }
        if (mirrored && reasonAcc.length <= REASON_TEXT_MAX) flush({ text: th });
      }
    }
  }
  // flush any trailing partial line (defensive; unlikely to contain a full event)
  lineBuf = "";
  // Fallback: reasoning-only model that never hit the threshold (very short reply).
  if (!sawContent && sawReasoning && reasonAcc.trim()) {
    flush({ reasoning: null });
    flush({ text: reasonAcc.trim() });
  }
  flush({});                                   // event: done
  res.end();
}

function sanitize(m) {
  if (!m || typeof m !== "object") return { role: "user", content: "" }; // tolerate malformed input
  const role = m.role === "assistant" ? "assistant" : "user"; // never "system" — blocks persona injection
  // Array content: text parts (paste file text) and image_url parts (vision models)
  if (Array.isArray(m.content)) {
    const parts = m.content.map((p) => {
      if (typeof p === "string") return p;
      if (p && typeof p === "object" && p.type === "image_url" && p.image_url && p.image_url.url) {
        return { type: "image_url", image_url: { url: String(p.image_url.url).slice(0, 6_000_000) } };
      }
      return (p && p.text) || "";
    });
    return { role, content: parts };
  }
  let content = typeof m.content === "string" ? m.content : "";
  return { role, content: content.slice(0, 40000) };
}

// ---- daily readings (best-effort USCCB proxy) ----
async function getReadings() {
  try {
    const res = await fetchWithTimeout("https://bible.usccb.org/bible/readings", {
      headers: { "User-Agent": "Mozilla/5.0" },
    }, 8000);
    if (!res.ok) throw new Error("readings " + res.status);
    const html = await res.text();
    const grab = (label) => {
      const i = html.indexOf(label);
      if (i < 0) return "";
      let j = html.indexOf("<p", i);
      if (j < 0) j = html.indexOf("<div", i);
      if (j < 0) return "";
      const body = html.slice(j, j + 2600);
      const txt = body.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
      return txt.slice(0, 900);
    };
    const first = grab("Reading I") || grab("First Reading");
    const psalm = grab("Responsorial Psalm");
    const gospel = grab("Gospel");
    if(first || psalm || gospel){
      return { first, psalm, gospel, disclaimer: "From the USCCB" };
    }
    throw new Error("empty scrape");
  } catch (e) {
    // USCCB is frequently bot-blocked. Fall back to a rotating selection from
    // the tradition so the greeting card is never empty. Clearly labeled.
    return curatedReadings();
  }
}

// A small, evergreen rotation of passages + a saint/feast, keyed by day-of-year.
// Not the literal daily lectionary, but always Scriptural and on-theme — a
// quiet daily anchor for the companion, not a substitute for the Missal.
const LECTIONARY = [
  { first: "Is 55:6-9 — Seek the Lord while he may be found; call upon him while he is near.", psalm: "Ps 63:1-8 — O God, you are my God, for you I long.", gospel: "Mt 11:28-30 — Come to me, all who labor and are burdened, and I will give you rest." },
  { first: "Jer 29:11-14 — For I know the plans I have for you, says the Lord, plans for peace.", psalm: "Ps 1:1-6 — Blessed is the one who delights in the law of the Lord.", gospel: "Lk 12:22-34 — Do not be anxious about your life; seek first his kingdom." },
  { first: "Rom 8:18-27 — The sufferings of this present time are not worth comparing to the glory.", psalm: "Ps 19:1-6 — The heavens declare the glory of God.", gospel: "Jn 14:1-6 — Do not let your hearts be troubled. In my Father's house are many rooms." },
  { first: "1 Jn 4:7-16 — Beloved, let us love one another, for love is from God.", psalm: "Ps 103:1-12 — Bless the Lord, O my soul, and forget not all his benefits.", gospel: "Mt 5:1-12 — Blessed are the poor in spirit, for theirs is the kingdom of heaven." },
  { first: "Phil 4:4-9 — Rejoice in the Lord always; the Lord is near.", psalm: "Ps 34:1-10 — Taste and see that the Lord is good.", gospel: "Lk 10:38-42 — Mary sat at the Lord's feet and listened to his word." },
  { first: "Eph 2:1-10 — By grace you have been saved, through faith — not of yourselves.", psalm: "Ps 51:1-15 — Have mercy on me, O God, according to your steadfast love.", gospel: "Mk 1:14-20 — The kingdom of God is at hand; repent and believe the gospel." },
  { first: "2 Cor 12:7-10 — My grace is sufficient for you, for my power is made perfect in weakness.", psalm: "Ps 91:1-8 — He who dwells in the shelter of the Most High abides under his shadow.", gospel: "Jn 15:1-11 — I am the vine; you are the branches. Abide in my love." },
];
function curatedReadings() {
  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const r = LECTIONARY[doy % LECTIONARY.length];
  return { ...r, disclaimer: "From the tradition" };
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url = (req.url || "").split("?")[0];
  try {
    if (req.method === "GET" && url === "/api/health") return sendJson(res, 200, { ok: true });
    if (req.method === "GET" && url === "/api/healthz") {
      const keyPresent = !!KEY;
      const modelCount = modelsCache.data ? modelsCache.data.length : 0;
      return sendJson(res, 200, {
        ok: keyPresent, keyPresent, modelCount, ts: Date.now(),
        uptimeSec: Math.round((Date.now() - metrics.startedAt) / 1000),
        metrics: {
          chatRequests: metrics.chatRequests,
          rateLimited: metrics.rateLimited,
          errors: metrics.errors,
          byModel: metrics.byModel,
        },
        feedbackCount: feedback.length,
      });
    }
    if (req.method === "GET" && url === "/api/models") {
      try { return sendJson(res, 200, { models: await getFreeModels() }); }
      catch (e) { return sendJson(res, 502, { error: "Could not fetch models." }); }
    }
    if (req.method === "GET" && url === "/api/readings") {
      try { return sendJson(res, 200, await getReadings()); }
      catch (e) { return sendJson(res, 502, { error: "Could not fetch today's readings." }); }
    }
    if (req.method === "POST" && url === "/api/chat") {
      if (rateLimited(getClientIp(req))) {
        metrics.rateLimited++;
        return sendJson(res, 429, {
          error: "Too many messages in a short time. Please wait a minute before sending another.",
        });
      }
      const body = await readBody(req);
      return await handleChat(req, res, body);
    }
    if (url === "/api/feedback") {
      if (req.method === "POST") {
        let body;
        try { body = await readBody(req); }
        catch (_) { return sendJson(res, 400, { error: "Invalid JSON body." }); }
        if (!body || typeof body !== "object") return sendJson(res, 400, { error: "Invalid body." });
        addFeedback({ reason: body.reason, detail: body.detail, model: body.model });
        return sendJson(res, 200, { ok: true });
      }
      if (req.method === "GET") {
        return sendJson(res, 200, {
          count: feedback.length,
          recent: feedback.slice(-20).reverse(),
        });
      }
      return sendJson(res, 405, { error: "Method not allowed." });
    }
    return sendJson(res, 404, { error: "Not found" });
  } catch (e) {
    return sendJson(res, 500, { error: String((e && e.message) || e) });
  }
});

server.listen(PORT, () => console.log(`SaintAugustineAI backend on :${PORT}`));

// Export internals for unit tests only (no effect on normal runtime).
if (typeof module !== "undefined" && module.exports) {
  module.exports = { fetchWithTimeout, proxyStream, getFreeModels, getReadings, sanitize };
}