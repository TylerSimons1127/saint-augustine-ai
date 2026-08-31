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
 * - delta.content       -> forwarded live as {text}      (the visible answer ONLY)
 * - delta.reasoning     -> forwarded live as {reasoning}  (the Thinking box ONLY)
 * Reasoning is NEVER converted into {text}. Just like ChatGPT/Claude/Gemini,
 * chain-of-thought stays on its own channel and never leaks into the reply.
 * If a model produces reasoning but NO real content by stream end (some reasoning
 * models emit everything under `reasoning`), we send a short honest fallback so the
 * user is not left with an empty bubble — never the raw reasoning as the answer.
 */
async function proxyStream(upstream, res) {
  let sawContent = false;
  let sawReasoning = false;
  let reasonAcc = "";
  const REASON_TRACE_MAX = 2400;             // cap what we reveal in the Thinking box
  const decoder = new TextDecoder();
  let lineBuf = "";

  const flush = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
  const answerGate = makeAnswerGate();

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
        // The real answer only: strip any planning/outline that some reasoning
        // models write into `content` before the actual reply begins.
        for (const part of answerGate(tok)) {
          if (part) { sawContent = true; flush({ text: part }); }
        }
      }
      if (th) {
        sawReasoning = true;
        reasonAcc += th;
        if (reasonAcc.length <= REASON_TRACE_MAX) flush({ reasoning: th });
      }
    }
  }
  lineBuf = "";
  // Flush any buffered final line from the answer gate (incomplete tail).
  for (const part of answerGate.final()) if (part) { sawContent = true; flush({ text: part }); }
  // If the model only reasoned and never answered, never dump the CoT as the reply.
  if (!sawContent) {
    flush({ reasoning: null });
    if (sawReasoning) {
      flush({ text: "*I have considered your question and would answer it — but the model produced only thought and no distinct reply this time. Please try again.*" });
    } else {
      flush({ text: "" });
    }
  }
  flush({});                                   // event: done
  res.end();
}

/* ---- content chain-of-thought filter ----
 * Some free reasoning models (e.g. nvidia/nemotron-3-ultra) emit their planning
 * outline / chain-of-thought INSIDE `delta.content` before the real answer:
 * bullet lists ("- House of fear:"), label lines ("Key themes:"), header-y prose
 * ("The house of fear vs love."), or meta notes ("Let me write this as…"). Without
 * filtering, that plan leaks into the visible reply. We buffer the leading content
 * and drop everything up to the first clean "answer paragraph" — a line of flowing
 * prose that is NOT an outline and (to be safe) does not look like a plan heading or
 * a bullet continuation. Filtering then turns off so the rest streams unchanged.
 * Conservative by design: we never risk clipping the middle of a real answer — we
 * only drop a LEADING block that reads as planning.
 */
function makeAnswerGate() {
  let decided = false;                    // have we locked onto the answer start?
  let buf = "";                           // pre-answer buffer (planning / self-narration)
  let emitBuf = "";                       // post-answer: current line being built
  const MAX_PRE = 40000;                  // safety cap; real answers appear well before this
  const planLine = (line) => {
    const s = line.trim();
    if (!s) return false;
    return isOutlineLine(line) || isPlanLikely(line) || isSourceCitation(line) || isSelfNarration(line);
  };
  const gate = function (tok) {
    if (!decided) {
      buf += tok;
      if (buf.length >= MAX_PRE) { decided = true; const h = buf; buf = ""; return [h]; }
      const lines = buf.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const s = trimmed;
        if (!trimmed) continue;
        // Commit ONLY when the line opens addressing the reader (you / peace / dear friend…).
        // Planning prose never does, so this is the reliable boundary.
        if (addressesReader(line)) { decided = true; const head = lines.slice(i).join("\n"); buf = ""; return [head]; }
        if (planLine(line)) continue;
        // First substantial prose line that is NOT planning and NOT self-narration is the
        // real answer beginning (the model may open with a scripture quote or a reflection,
        // not necessarily "you"). Commit here and start streaming; post-answer planning is
        // still stripped by the filtering below.
        if (s.length >= 30) { decided = true; const head = lines.slice(i).join("\n"); buf = ""; return [head]; }
        continue;
      }
      return [];
    }
    // Post-answer: STILL strip any interleaved planning / self-narration lines.
    emitBuf += tok;
    const out = [];
    let nl;
    while ((nl = emitBuf.indexOf("\n")) >= 0) {
      const line = emitBuf.slice(0, nl);
      emitBuf = emitBuf.slice(nl + 1);
      if (planLine(line)) continue;
      out.push(line + "\n");
    }
    return out;
  };
  gate.final = function () {
    const t = emitBuf.trim();
    emitBuf = "";
    if (!t || planLine(t)) return [];
    return [t];
  };
  return gate;
}

/* Does this line speak TO the reader (second person / vocative / greeting) rather than
 * describe the task or the speaker's process? Planning fragments ("The user wants…",
 * "Let me structure this…", "I'll draw on…") do not address the reader and are kept
 * out. A real Augustine opening addresses "you" or ushers the reader with a greeting.
 * We deliberately do NOT fall back to "any long sentence with punctuation" — bare
 * topic headers ("The distinction: servile fear vs the fear of love.") match that and
 * would wrongly commit the gate. The answer is identified by how it SPEAKS, not by
 * length. */
function addressesReader(line) {
  const s = line.trim();
  // The line must OPEN speaking to the reader (second-person / greeting / vocative),
  // not merely contain "you" somewhere — a citation line ("2 Cor 12:7-10 — My grace
  // is sufficient for YOU...") contains "you" but opens with a reference, so it is NOT
  // the answer start. Augustine's real answer opens with the address.
  if (/^(you|your|yours|peace (be|to)|my (dear|beloved|dearest)|dear (friend|soul|brother)|beloved|greetings|i greet you|well, (my|dear)|come,|listen,|sit,|ask me|you (ask|come|seek|wonder|say|write)|friend|dearest|beloved)\b/i.test(s)) return true;
  return false;
}

/* True if a line is "outline" — a bullet, numbered item, bare label, or explicit
 * planning/meta phrasing. */
function isOutlineLine(line) {
  const s = line.trim();
  if (!s) return false;
  if (/^[-*•·]\s/.test(s)) return true;                        // bullet item
  if (/^\d+[.)]\s/.test(s)) return true;                       // numbered item
  if (/^[A-Za-z][^:.&]{0,28}:\s*$/.test(s)) return true;       // bare label "Key themes:"
  if (/\b(key (themes|elements|points|ideas)|i (will|should|must|need|want) to|let me (write|think|reflect|outline|structure|begin)|here is (a|my)|my (plan|outline|structure)|to answer this|based on (the|this)|we need to|let's (write|answer|produce|output)|now i|i'm going to|as augustine i would|in this (answer|reply|response)|i'll (write|start|cover))\b/i.test(s)) return true;
  return false;
}

/* True if a non-outline line still LOOKS like plan prose rather than a real answer
 * opening — e.g. a short heading fragment, a continuation of a thought, or a line
 * whose length is too small to be a genuine sentence and reads like a topic header
 * ("The house of fear vs love."). We keep this conservative: only long prose lines
 * (>= 60 chars) or lines ending in sentence punctuation that clearly address the
 * reader are treated as the answer start. */
function isPlanLikely(line) {
  const s = line.trim();
  if (s.length < 24) return true;                              // tiny fragment -> plan
  if (/^(\[(system|plan|reasoning)\])|^\(.*\)$/.test(s)) return true;
  if (/\b(here's (a|my)|next,|now,|first(ly)?,|second(ly)?,|third,|finally,|in conclusion|in summary|let me (now )?|so, |okay,)\b/i.test(s)) return true;
  // Self-referential planning meta: the model narrating what it will write or how it
    // will write, rather than addressing the soul before it. These never belong in the
    // visible reply.
    if (/\b(i'?ll|i will|i want|i need to|i will now|i should|let me write|let me make|let me keep|i'?m going to|no headers|no bullet|bullet points|flowing prose|not a lecture|substantial meditation|keep it|make sure|i'?ll end|end with|the tldr|write this as|draw on|weave in|describe the |["']?tolle lege["']?\s*(scene|for)?)\b/i.test(s)) return true;
  // The speaker referring to the human as "the user" / "the question" / "the prompt"
  // is narrating the task, not addressing the soul — never an Augustine opening.
  if (/\b(the user|the question|the prompt|the request|this question (wants|asks|is about)|they (ask|want|asked))\b/i.test(s)) return true;
    // A heading-style fragment (title-case words, no sentence punctuation)
  if (!/[.!?;]/.test(s) && s.length < 70 && /^[A-Z][a-z]+(\s+[a-z]+){1,10}\.?$/.test(s)) return true;
  return false;
}

/* True if a line is a source/citation reference the model lists while planning
 * (e.g. "On the Spirit and the Letter - his letter to Sixtus, c. 412", "2 Cor 12:7-10 -",
 * "Sermon 158 on the...."). These are the model rehearsing authorities, not the answer. */
function isSourceCitation(line) {
  const s = line.trim();
  // A verse / chapter reference (2 Cor 12:7, Rom 5.12, Ps 51:3...)
  if (/(\d?\s?(cor|tim|rom|john|matt|ps|gen|exod|isa|jer|aug)\.?\s*\d*[:.]\d+)/i.test(s)) return true;
  // A titled work + dash + description (On the Spirit and the Letter - ...)
  if (/^[^–—-]{0,60}\s[–—-]\s/.test(s) && /(c\.?\s?\d{3,4}|sermon|letter|homily|treatise|confessions|de (trinitate|doctrina|civitate|spiritu)|on (the|his))/i.test(s)) return true;
  // A bare parenthetical attribution
  if (/^\s*\(.{0,40}\)\s*$/.test(s)) return true;
  return false;
}

/* True if a line is the model NARRATING ITS OWN WRITING rather than answering —
 * e.g. "ST. AUGUSTINE THINKING…", "I should write as Augustine", "Let me structure this:",
 * "Key texts:", "I'll cite the actual homily", "Substantial, meditative, with a prayer".
 * This is chain-of-thought that leaked into the content channel; it is dropped even after
 * the answer has begun streaming, so interleaved planning never reaches the bubble. */
function isSelfNarration(line) {
  const s = line.trim();
  if (!s) return false;
  // The model labelling its own process: "ST. AUGUSTINE THINKING…", "Augustine will…"
  if (/^(st\.? augustine|augustine)\b[^\x0A]{0,40}\b(thinking|will|should|want|need|must|reflect|consider|plan|begin|note)\b/i.test(s)) return true;
  // "I/we will|should|let me + a composition verb" — writing/structuring, not answering
  if (/\b(i should|i will|i want|i need to|i must|let me|i'll|we need to|i'm going to)\b/i.test(s)
      && /\b(write|structure|outline|compose|frame|format|organize|phrase|set (it|this) out|weave|draw on|cite|reference|reflect|plan|note|mention|make sure|ensure|keep it|rehearse|sketch)\b/i.test(s)) return true;
  // Explicit plan labels the model emits while rehearsing
  if (/^(key texts|key sources|also references|references:|sources:|the distinction between timor|personal opening|theological distinction|a meditation|substantial, meditative|close with a blessing|i'll cite|actually, the famous passage|here is (a|my)|in augustine'?s voice|the famous passage is|tractatus in epistolam|let me set)/i.test(s)) return true;
  return false;
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

// ---- saint of the day (Franciscan Media, with offline fallback) ----
// Franciscan Media bot-blocks bare requests; a realistic browser UA is required.
const SAINT_UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};
function cleanHtml(h) {
  return String(h)
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/&#x?[0-9a-f]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
async function getSaint() {
  try {
    const list = await fetchWithTimeout("https://www.franciscanmedia.org/saint-of-the-day/", { headers: SAINT_UA }, 9000);
    if (!list.ok) throw new Error("saint list " + list.status);
    const html = await list.text();

    // First saint card on the page.
    const boxRe = /<a\s+class="elementor-post__thumbnail__link"\s+href="(https:\/\/www\.franciscanmedia\.org\/saint-of-the-day\/[^"]+)\/"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i;
    const box = html.match(boxRe);
    if (!box) throw new Error("no saint card found");
    const url = box[1].replace(/\/$/, "");
    const image = box[2];

    // Name + excerpt live in the same card, just after the thumbnail link.
    const cardPos = html.indexOf(box[1]);
    const titlePos = html.indexOf("elementor-post__title", cardPos);
    const nameM = html.slice(titlePos, titlePos + 500).match(/<a[^>]+href="[^"]+"[^>]*>([^<]+)<\/a>/i);
    const name = nameM ? nameM[1].trim() : "";
    const excPos = html.indexOf("elementor-post__excerpt", cardPos);
    const excerptM = excPos > 0 ? html.slice(excPos).match(/<p[^>]*>([\s\S]*?)<\/p>/) : null;
    const excerpt = excerptM ? cleanHtml(excerptM[1]).slice(0, 320) : "";
    const datePos = html.indexOf("elementor-post-date", cardPos);
    const dateM = datePos > 0 ? html.slice(datePos).match(/>\s*([A-Z][a-z]+ \d{1,2})\s*</) : null;
    const date = dateM ? dateM[1].trim() : "";

    // Pull the fuller biography from the detail page.
    let bio = "";
    try {
      const det = await fetchWithTimeout(url + "/", { headers: SAINT_UA }, 9000);
      if (det.ok) {
        const dh = await det.text();
        const storyH = dh.match(/<h[34][^>]*>([^<]*?)(?:&#8217;|')s Story<\/h[34]>/i);
        if (storyH) {
          const start = dh.indexOf(storyH[0]) + storyH[0].length;
          let end = dh.indexOf("<h4", start);
          if (end < 0) end = dh.indexOf("<blockquote", start);
          const seg = dh.slice(start, end > 0 ? end : start + 6000);
          const ps = [...seg.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
            .map((m) => cleanHtml(m[1]))
            .filter((t) => t.length > 40);
          bio = ps.slice(0, 3).join(" ").slice(0, 520);
        }
      }
    } catch (_) {
      /* detail fetch is best-effort; excerpt still carries the summary */
    }

    if (!name) throw new Error("parsed empty saint name");
    return {
      name,
      date,
      excerpt: excerpt || bio.slice(0, 320),
      bio: bio || excerpt,
      image,
      link: url,
      source: "Franciscan Media",
    };
  } catch (e) {
    // Site unreachable / blocked / changed markup: fall back to a curated,
    // on-theme saint so the card is never empty. Clearly labeled.
    return curatedSaint();
  }
}
// Evergreen offline rotation (name + bio + a "connected to Augustine" line).
const FALLBACK_SAINTS = [
  { name: "St. Augustine of Hippo", date: "August 28", bio: "Bishop, theologian, and Doctor of the Church (354–430). Author of the Confessions and the City of God, he became the greatest Latin Father of the West — teaching on grace, the Trinity, and the restless heart that finds no rest but in God. Converted in a Milan garden in 386, he is the patron of this very app.", conn: "He is the reason we are here. Like him, we are made for God and restless until we rest in him." },
  { name: "St. Monica", date: "August 27", bio: "Mother of St. Augustine and a woman of great and persevering prayer. For years she wept and pleaded for the conversion of her son; her tears, Augustine said, watered the Church. She is the patron of mothers and of those who pray for wayward loved ones.", conn: "Augustine called her the faithful one whose prayers wrested him from his wandering and gave the world a bishop." },
  { name: "St. Thérèse of Lisieux", date: "October 1", bio: "The 'Little Flower' (1873–1897), a Carmelite whose 'little way' of trust and love became a path for millions. She taught that holiness is found not in grand deeds but in ordinary love done completely.", conn: "Thérèse called Augustine her 'brother in the faith'; both wrote of restless hearts and the voyage home to God." },
  { name: "St. Benedict", date: "July 11", bio: "Father of Western monasticism (c. 480–547), author of the Rule that shaped Christian Europe. He taught that we should prefer nothing whatsoever to the love of Christ, and that we begin each day by rising as if to meet the Lord.", conn: "Augustine's restless heart found its rest in God; Benedict built a school of rest wherein a soul learns to seek God in all things." },
  { name: "St. Francis of Assisi", date: "October 4", bio: "The poor little man of Assisi (1181–1226) who rebuilt Christ's Church and preached to the birds. He bore the wounds of Christ and called all creation his brother and sister.", conn: "Francis lived the poverty Augustine praised in the Confessions — 'Late have I loved you, Beauty ever ancient, ever new.'" },
  { name: "St. Mary Magdalene", date: "July 22", bio: "The 'apostle to the apostles,' first to see the risen Christ and sent to tell the others. Forgiven much, she loved much, and her tears at the empty tomb washed the world clean.", conn: "Augustine called her the figure of the Church herself — forgiven much, and so loving much." },
  { name: "St. Joseph", date: "March 19", bio: "The silent carpenter of Nazareth, guardian of the Holy Family, declared patron of the universal Church. By believing the angel he became the just man who protected the Word made flesh.", conn: "Augustine exalted Joseph as the faithful and chaste husband, a model of obedience for every father." },
];
function curatedSaint() {
  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const s = FALLBACK_SAINTS[doy % FALLBACK_SAINTS.length];
  return { name: s.name, date: s.date, excerpt: s.bio.slice(0, 320), bio: s.bio, image: "", link: "https://www.franciscanmedia.org/saint-of-the-day/", conn: s.conn, source: "from the tradition" };
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
    if (req.method === "GET" && url === "/api/saint") {
      try { return sendJson(res, 200, await getSaint()); }
      catch (e) { return sendJson(res, 502, { error: "Could not fetch today's saint." }); }
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
  module.exports = { fetchWithTimeout, proxyStream, getFreeModels, getReadings, getSaint, sanitize };
}