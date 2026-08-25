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
const OPENROUTER = "https://openrouter.ai/api/v1";
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
  const res = await fetch(`${OPENROUTER}/models`, { headers: { Authorization: `Bearer ${KEY}` } });
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
    temperature = 0.45;
    maxTokens = 2200;
    depthNote =
      "ANSWER MODE — CONTEMPLATIVE: Go really deep. Walk through the what, the why, " +
      "and the depth beneath the why. Draw on Scripture, the Fathers, Aquinas, the " +
      "Catechism. Let the answer be thorough and unhurried. End with a short 'TLDR:' line.";
  } // thoughtful = neutral default (already set above)

  const sysAugmented = depthNote
    ? { role: "system", content: SYSTEM_PROMPT + "\n\n" + depthNote }
    : sys;

  const payload = {
    model,
    stream: stream !== false,
    messages: [sysAugmented, ...history],
    max_tokens: maxTokens,
    temperature,
  };

  let upstream;
  try {
    upstream = await fetch(`${OPENROUTER}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return sendJson(res, 502, { error: "Could not reach OpenRouter." });
  }

  // Non-stream responses (if a client sends stream:false) — simple JSON
  if (!payload.stream) {
    if (!upstream.ok) {
      let detail = "";
      try { detail = (await upstream.json()).error?.message || ""; } catch (_) {}
      return sendJson(res, upstream.status, { error: friendlyError(upstream.status), detail });
    }
    const json = await upstream.json();
    return sendJson(res, 200, {
      content: json.choices?.[0]?.message?.content || "",
      model: json.model,
    });
  }

  // ---- SSE stream to the browser ----
  if (!upstream.ok || !upstream.body) {
    let detail = "";
    try { detail = (await upstream.json()).error?.message || ""; } catch (_) {}
    return sendJson(res, upstream.status, { error: friendlyError(upstream.status), detail });
  }
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "X-Accel-Buffering": "no",
  });
  let sawContent = false;
  let reasonAcc = "";
  const decoder = new TextDecoder();
  for await (const chunk of upstream.body) {
    const text = decoder.decode(chunk, { stream: true }).replace(/\r\n/g, "\n");
    for (const line of text.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") { res.write("event: done\ndata: {}\n\n"); continue; }
      let j;
      try { j = JSON.parse(data); } catch (_) { continue; }
      const delta = j.choices?.[0]?.delta;
      // thinking tokens — sent under a distinct `reasoning` field so the client
      // can hide them without any SSE `event:` state tracking.
      let th = delta?.reasoning ?? delta?.thinking ?? null;
      if (th) {
        reasonAcc += th;
        res.write(`data: ${JSON.stringify({ reasoning: th })}\n\n`);
      }
      const tok = delta?.content ?? "";
      if (tok) { sawContent = true; res.write(`data: ${JSON.stringify({ text: tok })}\n\n`); }
    }
  }
  // Some free reasoning models stream their answer ONLY under `reasoning`.
  // If no content arrived, surface the accumulated reasoning so the user never
  // sees an empty reply — better a visible answer than a blank bubble.
  if (!sawContent && reasonAcc.trim()) {
    res.write(`data: ${JSON.stringify({ text: reasonAcc.trim() })}\n\n`);
  }
  res.write("event: done\ndata: {}\n\n");
  res.end();
}

function sanitize(m) {
  const role = m.role === "assistant" ? "assistant" : m.role === "system" ? "user" : "user";
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
  const res = await fetch("https://bible.usccb.org/bible/readings", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error("readings " + res.status);
  const html = await res.text();
  // The current reading page lists episode headings like "Reading I", "Responsorial Psalm", "Alleluia", "Gospel"
  const heads = { "1": "First Reading", "2": "Responsorial Psalm", "3": "Second Reading", "4": "Reading II", "g": "Gospel" };
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
  return {
    first: grab("Reading I") || grab("First Reading"),
    psalm: grab("Responsorial Psalm"),
    gospel: grab("Gospel"),
    disclaimer: "Best-effort from USCCB daily readings.",
  };
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url = (req.url || "").split("?")[0];
  try {
    if (req.method === "GET" && url === "/api/health") return sendJson(res, 200, { ok: true });
    if (req.method === "GET" && url === "/api/models") {
      try { return sendJson(res, 200, { models: await getFreeModels() }); }
      catch (e) { return sendJson(res, 502, { error: "Could not fetch models." }); }
    }
    if (req.method === "GET" && url === "/api/readings") {
      try { return sendJson(res, 200, await getReadings()); }
      catch (e) { return sendJson(res, 502, { error: "Could not fetch today's readings." }); }
    }
    if (req.method === "POST" && url === "/api/chat") {
      const body = await readBody(req);
      return await handleChat(req, res, body);
    }
    return sendJson(res, 404, { error: "Not found" });
  } catch (e) {
    return sendJson(res, 500, { error: String((e && e.message) || e) });
  }
});

server.listen(PORT, () => console.log(`SaintAugustineAI backend on :${PORT}`));