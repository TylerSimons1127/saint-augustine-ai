# Saint Augustine AI

> *"You have made us for yourself, O Lord, and our heart is restless until it rests in you."* — *Confessions* I, 1

A Catholic AI companion in the voice of Augustine of Hippo. Ask it to explain a passage, console a weary thought, or reason through what weighs on you — it draws on Sacred Scripture, the Magisterium, the Institute of Catholic Culture, and careful reasoning.

**Canonical live app (Vercel):** https://staugustineai.vercel.app/

**GitHub Pages mirror:** https://tylersimons1127.github.io/saint-augustine-ai/ — a secondary static copy, not the canonical address.

## How it works

```
Browser (Vercel; Pages mirror)      Node backend (Render free tier)
┌─────────────────────┐            ┌──────────────────────────────┐
│  index.html         │  /api/models│  server.js                    │
│  config.js  ────────┼────────────►  · OpenRouter proxy            │
│  (static, public)   │  /api/chat  │  · reads OPENROUTER_API_KEY   │
└─────────────────────┘  (SSE)     └──────────┬───────────────────┘
                                               │ OpenRouter API
                                        ┌──────▼─────┐
                                        │ free models│
                                        └────────────┘
```

- **Frontend** (`index.html`) — the ChatGPT-style interface.
- **Backend** (`backend/server.js`) — a tiny zero-dependency Node server that holds the **OpenRouter API key server-side**. It serves the model picker and chat stream, sourced daily readings and saint content, a minimal health check, and category-only answer feedback. The key stays out of the public repo.
- **System prompt** (`backend/system-prompt.txt`) — the Catholic AI persona (adapted from the Hermes `catholic-ai` SOUL), applied to **every** model so the voice is consistent no matter which free model a user picks.

## Go live — two deploys

> ⚠️ **Never commit your OpenRouter API key.** It must only ever live as an environment variable on the backend host.

### 1. Deploy the backend (holds the key)

On a free Node host that supports build+run with env vars (Render, Railway, Fly, Cyclic…), point it at the `backend/` folder:

- **Build command:** (none — zero dependencies; or `npm install` if you add a package lock)
- **Start command:** `npm start`
- **Env var:** `OPENROUTER_API_KEY=<your key>`

Example with [Render](https://render.com) free tier (also works via `render.yaml`):

```yaml
services:
  - type: web
    name: saint-augustine-ai-backend
    runtime: node
    plan: free
    env: node
    rootDir: backend
    buildCommand: ""
    startCommand: npm start
    envVars:
      - key: OPENROUTER_API_KEY
        sync: false    # set manually, never committed
```

### 2. Point the frontend at the backend

Edit `config.js` at the repo root:

```js
window.SA_API_BASE = "https://your-backend.onrender.com";
```

Push to `main` — Vercel publishes the canonical app automatically. GitHub Actions also refreshes a clearly labeled GitHub Pages mirror.

### Local dev

```bash
# terminal 1 — backend (port 3000)
cd backend
OPENROUTER_API_KEY=sk-or-v1-... npm start

# terminal 2 — frontend
npx http-server -p 8080 -c-1 .
# open http://localhost:8080/?api=http://localhost:3000
```

## Features

- **Chat** — model selector populated live from OpenRouter's free models, streaming responses, citations, per-page/per-conversation drafts, whole-conversation export, and sharing either a conversation or selected messages.
- Thinking level — *Quick / Thoughtful / Contemplative* — maps to temperature + max-tokens (and model reasoning where supported).
- **Study** — 32 connected daily lessons with source trails, explicit labels for direct quotations versus editorial wording, an alphabetical glossary, local notes and highlights, lesson links, a short reading path, and quiz review.
- **Today** — sourced readings and saint biography, lesson and quiz progress, streak controls, cross-links to Chat and Prayer, and a local archive of days actually opened.
- **Prayer** — intention drafts and saved intentions, optional local timer, and explicit controls for carrying a passage into a prayer request.
- **Device-local tools** — saved answers and prayers, glossary review, quiet reading, notes, and user-selected JSON backup/restore.
- File attachments are handled by the app's existing composer; submitted message and attachment content needed to answer are sent through Render to OpenRouter.
- **Structured citations** — Scripture, Catechism (CCC §), and major Magisterial documents are rendered with a quiet citation style and linked to authoritative sources (Bible Gateway NRSVCE, Vatican.va).
- **Writing-style clue** — an optional local paste-formatting heuristic is described as uncertain and never treated as proof of AI authorship.
- **Backend availability** — the app checks the Render service before sending a message and explains when it is waking; it does not send the same message twice automatically.

### Release checks

Install dependencies, then run `npm run test:release` from the repository root. This parses the inline app scripts, checks the 32 lesson/source records and linked pages, and runs the responsive Playwright flows at mobile, tablet, and desktop widths. GitHub Actions runs the same suite on pull requests and pushes to `main`.

## Security note

Conversation history, notes, and preferences are kept in this browser unless you export them. When you submit a message, the text and any attachment content needed for the request travel through the Render backend to OpenRouter so a model can answer. The app does not promise how those providers handle submitted data; avoid sending sensitive information. The API key lives only in the backend's environment and is never committed to this repository.

## License

MIT.
