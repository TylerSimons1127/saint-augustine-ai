// SaintAugustineAI — Cloudflare Workers backend
// A stateless proxy that holds the OpenRouter API key server-side and serves
// the two endpoints (/api/models, /api/chat) over CORS to the public frontend.
//
// Deploy (free, no card, ~2 min):
//   1. Create a Cloudflare account: https://dash.cloudflare.com/sign-up
//   2. Create a Worker name it e.g. "saint-augustine-ai"
//   3. In Settings -> Variables, add:
//        OPENROUTER_API_KEY  =  sk-or-v1-…              (encrypt it)
//   4. Paste THIS FILE into the Worker editor, Save & Deploy.
//   5. It's live at https://saint-augustine-ai.<subdomain>.workers.dev
//   6. Put that URL in the frontend config.js as window.SA_API_BASE

import { SYSTEM_PROMPT } from "./system-prompt";

const OPENROUTER = "https://openrouter.ai/api/v1";
const MODELS_TTL_SECONDS = 120; // cache the free-model list for 2 min

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (!env.OPENROUTER_API_KEY) {
      return json(cors, 503, { error: "Backend missing OPENROUTER_API_KEY env var." });
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      return json(cors, 200, { ok: true });
    }

    if (request.method === "GET" && url.pathname === "/api/models") {
      try {
        const models = await getFreeModels(env, cors);
        return json(cors, 200, { models });
      } catch (e) {
        return json(cors, 502, { error: "Could not fetch models." });
      }
    }

    if (request.method === "POST" && url.pathname === "/api/chat") {
      let body;
      try { body = await request.json(); } catch (e) { body = {}; }
      const { model, messages, reasoning, stream } = body;
      if (!model) return json(cors, 400, { error: "Missing 'model'." });
      if (!Array.isArray(messages) || !messages.length)
        return json(cors, 400, { error: "Missing 'messages'." });

      const payload = {
        model,
        stream: stream !== false,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.slice(-24).map(sanitize),
        ],
        max_tokens: reasoning === "contemplative" ? 2048 : 1024,
        temperature: reasoning === "quick" ? 0.9 : reasoning === "contemplative" ? 0.5 : 0.7,
      };

      const upstream = await fetch(`${OPENROUTER}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENROUTER_API_KEY}` },
        body: JSON.stringify(payload),
      });

      if (!stream || !upstream.ok) {
        if (!upstream.ok) {
          const err = await upstream.json().catch(() => ({}));
          return json(cors, upstream.status, { error: friendly(upstream.status), detail: err.error?.message || "" });
        }
        const j = await upstream.json();
        return json(cors, 200, { content: j.choices?.[0]?.message?.content || "", model: j.model });
      }

      // --- stream SSE back to the browser ---
      const reader = upstream.body.getReader();
      const dec = new TextDecoder();
      let buffer = "";
      let sawContent = false;
      let reasonAcc = "";
      const sse = new TransformStream();
      const writer = sse.writable.getWriter();
      const enc = new TextEncoder();
      (async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += dec.decode(value, { stream: true });
            let idx;
            while ((idx = buffer.indexOf("\n")) >= 0) {
              const line = buffer.slice(0, idx).trim();
              buffer = buffer.slice(idx + 1);
              if (!line.startsWith("data:")) continue;
              const data = line.slice(5).trim();
              if (data === "[DONE]") continue;
              let j; try { j = JSON.parse(data); } catch (_) { continue; }
              const delta = j.choices?.[0]?.delta;
              const th = delta?.reasoning ?? delta?.thinking ?? "";
              if (th) { reasonAcc += th; continue; }               // hide COT
              const tok = delta?.content ?? "";
              if (tok) { sawContent = true; await writer.write(enc.encode(`data: ${JSON.stringify({ text: tok })}\n\n`)); }
            }
          }
          if (!sawContent && reasonAcc.trim()) {
            await writer.write(enc.encode(`data: ${JSON.stringify({ text: reasonAcc.trim() })}\n\n`));
          }
          await writer.write(enc.encode(`event: done\ndata: {}\n\n`));
        } catch (e) {
          await writer.write(enc.encode(`event: done\ndata: {}\n\n`));
        } finally {
          try { await writer.close(); } catch (_) {}
        }
      })();
      return new Response(sse.readable, {
        status: 200,
        headers: {
          ...cors,
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
        },
      });
    }

    return json(cors, 404, { error: "Not found" });
  },
};

// ---- model cache (Cloudflare KV-free: use the edge cache) ----
async function getFreeModels(env, cors) {
  const cache = caches.default;
  const cacheUrl = "https://saint-augustine-ai/models.json";
  const cached = await cache.match(cacheUrl);
  if (cached) {
    const j = await cached.json();
    if (j && Array.isArray(j.models)) return j.models;
  }
  const res = await fetch(`${OPENROUTER}/models`, {
    headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}` },
  });
  if (!res.ok) throw new Error(`models ${res.status}`);
  const j = await res.json();
  const list = (j.data || [])
    .filter((m) => m.id.includes(":free") && m.pricing && m.pricing.prompt === "0" && m.pricing.completion === "0")
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((m) => ({
      id: m.id,
      name: pretty(m.id),
      desc: (m.description || "").replace(/\s+/g, " ").trim().slice(0, 120),
      context: m.context_length || null,
    }));
  await cache.put(
    cacheUrl,
    new Response(JSON.stringify({ models: list }), {
      headers: { "Content-Type": "application/json", "Cache-Control": `s-maxage=${MODELS_TTL_SECONDS}` },
    })
  );
  return list;
}

function pretty(id) {
  const base = id.replace(/:free$/, "");
  const parts = base.split("/");
  const slug = parts[parts.length - 1] || base;
  const name = slug.split("-").map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
  return `${name} · ${parts[0] || ""}`;
}

function sanitize(m) {
  const role = m.role === "assistant" ? "assistant" : "user";
  let content = typeof m.content === "string" ? m.content : "";
  if (Array.isArray(m.content)) content = m.content.map((p) => (typeof p === "string" ? p : p.text || "")).join("\n");
  return { role, content: content.slice(0, 40000) };
}

function friendly(status) {
  if (status === 401) return "Backend OpenRouter key missing/invalid.";
  if (status === 429) return "That free model is rate-limited. Pick another or retry shortly.";
  if (status === 402) return "OpenRouter account has no credits left.";
  return `OpenRouter returned ${status}.`;
}

function json(cors, code, obj) {
  return new Response(JSON.stringify(obj), {
    status: code,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}