# Saint Augustine AI

> *"You have made us for yourself, O Lord, and our heart is restless until it rests in you."* — *Confessions* I, 1

A Catholic AI companion in the voice of Augustine of Hippo. Ask it to explain a passage, console a weary thought, or reason through what weighs on you — it draws on Sacred Scripture, the Magisterium, the Institute of Catholic Culture, and careful reasoning.

**Live app:** https://tylersimons1127.github.io/saint-augustine-ai/

## How it works

```
Browser (GitHub Pages)              Node backend (Render free tier)
┌─────────────────────┐            ┌──────────────────────────────┐
│  index.html         │  /api/models│  server.js                    │
│  config.js  ────────┼────────────►  · OpenAI-compatible proxy     │
│  (static, public)   │  /api/chat  │  · reads OPENROUTER_API_KEY   │
└─────────────────────┘  (SSE)     └──────────┬───────────────────┘
                                               │ OpenRouter API
                                        ┌──────▼─────┐
                                        │ free models│
                                        └────────────┘
```

- **Frontend** (`index.html`) — the ChatGPT-style interface.
- **Backend** (`backend/server.js`) — a tiny zero-dependency Node server that holds the **OpenRouter API key server-side** and proxies two endpoints: `GET /api/models` (the free-model picker) and `POST /api/chat` (streams responses). This is what keeps the secret out of the public repo.
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

Push to `main` — the GitHub Actions workflow deploys the frontend to Pages automatically. Done: anyone with the link can use the AI.

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

- Model selector populated live from OpenRouter's **free** models.
- Thinking level — *Quick / Thoughtful / Contemplative* — maps to temperature + max-tokens (and model reasoning where supported).
- Streaming responses (SSE) so replies appear as they're generated.
- Conversation history kept in the browser.
- File attachments accepted (metadata passed to the model).

## Security note

The API key lives only in the backend's environment, never in a committed file. The frontend talks to the backend over your deployed endpoint. Anyone can *use* the AI, but nobody can extract your key from the repo or the page source.

## License

MIT.