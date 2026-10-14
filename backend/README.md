# Saint Augustine AI backend

Zero-dependency Node.js service that sends chat requests to Groq first when
configured, then automatically falls back to curated OpenRouter free models.
Bedrock remains an optional legacy primary if Groq is not configured. Provider
credentials stay on the server; daily saint reflections use the same order.

## Run

```bash
cd backend
npm install
npm start
npm test
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP listen port. |
| `GROQ_API_KEY` | — | Groq API key. Set it in Render's secret environment settings; when present, Groq becomes the primary provider. |
| `GROQ_MODEL_ID` | `openai/gpt-oss-120b` | Groq model ID. |
| `GROQ_BASE_URL` | `https://api.groq.com/openai/v1` | Optional Groq-compatible API base URL. The server appends `/chat/completions`. |
| `GROQ_TIMEOUT_MS` | `20000` | Max time waiting for Groq response headers before trying OpenRouter. |
| `GROQ_STREAM_START_TIMEOUT_MS` | `7000` | Max time waiting for the first Groq stream bytes before trying OpenRouter. |
| `AWS_BEARER_TOKEN_BEDROCK` | — | Amazon Bedrock API key. Set it in Render's secret environment settings. `BEDROCK_API_KEY` is also accepted as an alias. |
| `AWS_REGION` | `us-east-1` | Bedrock region used by the default endpoint. |
| `BEDROCK_MODEL_ID` | `nvidia.nemotron-super-3-120b` | Primary Bedrock model ID. Choose a model available in the selected region that supports Chat Completions and streaming. |
| `BEDROCK_BASE_URL` | `https://bedrock-mantle.<region>.api.aws/v1` | Optional Bedrock API base URL override. Nemotron 3 Super serves Chat Completions on Bedrock Mantle. The server appends `/chat/completions`. |
| `BEDROCK_TIMEOUT_MS` | `20000` | Max time waiting for Bedrock response headers before trying OpenRouter. |
| `BEDROCK_STREAM_START_TIMEOUT_MS` | `7000` | Max time waiting for the first Bedrock stream bytes before trying OpenRouter. |
| `OPENROUTER_API_KEY` | — | OpenRouter fallback key. Required for failover. |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | Optional OpenRouter URL override, used by the self-contained backend checks. |
| `SYSPROMPT_CACHE_MS` | `120000` | Cache duration for the model picker list. |

Never commit provider keys or put them in frontend configuration. Groq's free
plan has provider-set quotas; all app users share the backend key's quota.

## Routes

| Method | Route | Notes |
| --- | --- | --- |
| GET | `/api/health` | Liveness probe. |
| GET | `/api/healthz` | Liveness probe used before chat sends. |
| GET | `/api/models` | Configured primary option followed by OpenRouter fallback choices. |
| GET | `/api/readings` | Best-effort daily Mass readings. |
| GET | `/api/saint` | Saint of the day and its reflections. |
| POST | `/api/chat` | Streaming chat; forwards answer text only and discards reasoning. |
| POST/GET | `/api/feedback` | Category-only feedback; never stores conversation text. |

## Provider order

1. The browser can choose the configured primary or nominate a preferred
   OpenRouter backup. The server accepts only these known IDs; callers cannot
   use this public endpoint to proxy arbitrary paid models.
2. When `GROQ_API_KEY` is configured, chat and generated saint reflections use
   the configured Groq model first. Groq's OpenAI-compatible Chat Completions
   endpoint preserves the existing stream format and hides reasoning tokens.
3. If Groq errors, times out, or returns an invalid stream before the app
   starts streaming to the browser, the server tries the chosen OpenRouter
   backup, then the remaining curated OpenRouter models.
4. If Groq is not configured but a Bedrock key is, Bedrock remains the primary.
   If neither primary key is configured, the backend continues with OpenRouter.

The OpenRouter model list is cached and used for backup choices. If OpenRouter
is temporarily unable to list models while Groq or Bedrock is configured,
`/api/models` still returns the configured primary option.

## Data and credentials

Conversation history is stored in the browser. A message sent for a reply is
transmitted from the browser through this backend to Groq when configured, or to
Bedrock if Groq is absent; if the primary cannot answer, it can be sent to
OpenRouter as the backup. Each provider has its own data policies, so avoid
sending sensitive information. API keys remain in Render environment variables
and are not returned from health routes.
