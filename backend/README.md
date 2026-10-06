# SaintAugustineAI — Backend

Zero-dependency Node.js HTTP server that proxies chat requests to OpenRouter's
free-tier models, streaming the answer back to the browser as Server-Sent Events.
The persona (Saint Augustine) lives in `system-prompt.txt`; this server is the
transport, guard-rails, and observability layer.

## Run

```bash
cd backend
npm install        # no deps, but creates node_modules/.bin if needed
npm start           # listens on PORT (default 3000)
npm test            # runs the full backend test suite (no external server needed)
```

`npm test` runs every test in `backend/` in sequence. Each test starts its own
backend + stub on isolated ports, so the suite is fully self-contained — no
running server or network access required.

## Environment variables

| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | `3000` | HTTP listen port |
| `OPENROUTER_API_KEY` | — | **Required in production.** Your OpenRouter key. Never exposed to the browser. |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | Override for tests/proxies (points at a stub). |
| `SYSPROMPT_CACHE_MS` | `120000` | How long the `/api/models` response is cached. |

## Routes

| Method | Route | Notes |
|--------|-------|-------|
| GET | `/api/health` | `{ ok: true }` liveness probe. |
| GET | `/api/healthz` | Minimal `{ ok: true }` health response; internal metrics are not exposed. |
| GET | `/api/models` | Curated + free models from OpenRouter, cached. |
| GET | `/api/readings` | Best-effort daily Mass readings (USCCB). May 502 if bot-blocked. |
| GET | `/api/saint` | Saint of the day and a source-grounded Augustine connection (Franciscan Media when available, curated fallback otherwise). |
| POST | `/api/chat` | Streaming chat proxy (see below). Rate-limited per IP. |
| POST | `/api/feedback` | Submit an allowlisted feedback category only; extra fields are discarded. GET is not available. |

## How `/api/chat` works

1. **Allowlist guard** — the requested `model` must be in the curated `CURATED`
   list. The public API is open, so without this anyone could proxy *paid*
   OpenRouter models through your free key. Non-curated models are rejected (400)
   before any upstream call.
2. **Rate limit** — per-IP token bucket (capacity 8, refills 1 every 7.5s). A
   burst of 8 is allowed, then requests space out. Protects the free-tier quota
   from a flood or a scraped endpoint.
3. **Streaming proxy** — forwards only answer text from `delta.content` to the
   browser in real time. Private reasoning/thinking deltas are discarded and
   never exposed in the interface. If a model produces no answer text, the
   browser receives a short retry message instead of internal reasoning.
4. **Model fallback** — if the chosen model 404s / 429s / times out, the server
   retries the next curated model. Free models vanish without warning; this keeps
   the chat alive instead of failing the user.
5. **Hard timeouts** — every outbound fetch (models, chat, readings) has an
   `AbortController` timeout. A hung upstream returns a clean 504, not an
   infinite spinner.

## Metrics & feedback

The process keeps aggregate operational counters in memory: total chat
requests, per-model ok/err/fallback counts, error-status tallies, and
rate-limit hits. The `/api/healthz` route does not expose those counters. The
feedback endpoint accepts only an allowlisted category, counts it in memory,
discards free-form fields, and has no public listing route. Counters reset when
the process restarts or deploys; they are not written to app storage.

## Notes for contributors

- This server has **no npm dependencies** — do not add any without reason.
- The frontend (in the repo root) talks to this server via `config.js`
  (`window.SA_API_BASE`). It is a separate deploy (GitHub Pages) from this
  backend (Render).
- When Render auto-deploy is off, push to `main` then click **Manual Deploy** on
  the Render dashboard for changes to go live.
