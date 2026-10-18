# Saint Augustine AI backend

Zero-dependency Node.js service with OpenRouter free reasoning as the default.
Chat and the daily saint feature both start with `liquid/lfm-2.5-2.6b:free`,
then try stronger free reasoning backups and configured Groq. Legacy Bedrock
remains available without Groq. Credentials and reasoning traces stay server-side.

The biography targets 240–320 words; the Augustine connection targets 90–140.
Both are generated together from the complete biography and a reviewed passage
from Augustine, then validated and cached by date, saint, and source fingerprint.
Concurrent requests share the same generation. Short sources are not padded.
Responses expose `summaryModel`, `summaryProvider`, `summarySource`, and reviewed
`connectionReferences`; source fallbacks never claim to be AI-generated.

Liquid's free endpoint may retain prompts/outputs for training, as stated on its
[OpenRouter model card](https://openrouter.ai/liquid/lfm-2.5-2.6b:free). Do not send
sensitive information. It is a small model with limited knowledge-heavy ability;
daily content is grounded in supplied sources, not unsupported recollection.

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
| `PRIMARY_PROVIDER` | `openrouter` | Default provider when configured. `groq` and `bedrock` are explicit legacy overrides. |
| `GROQ_API_KEY` | — | Server-side key for the configured Groq fallback. |
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
| `OPENROUTER_API_KEY` | — | Server-side key for the default free reasoning model and free model fallbacks. |
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
2. OpenRouter starts with Liquid, or the explicitly selected curated free model.
   Reasoning is enabled internally and excluded from the response. Routes have
   a zero input/output price ceiling and prefer higher throughput.
3. If the free models cannot answer, the configured Groq service is a fallback.
   Chat and the daily saint feature use the same provider order and primary model.
4. Without OpenRouter, Groq is used when available, otherwise legacy Bedrock.
   `PRIMARY_PROVIDER=groq` or `bedrock` explicitly opts into the earlier ordering.

The OpenRouter model list is cached and used for backup choices. If OpenRouter
is temporarily unable to list models while Groq or Bedrock is configured,
`/api/models` still returns the configured primary option.

## Data and credentials

Conversation history is stored in the browser. A message sent for a reply is
transmitted from the browser through this backend to OpenRouter by default.
Other free OpenRouter routes and the configured Groq or legacy Bedrock service
can answer if the preferred route fails. Liquid's free provider may retain
prompts and outputs and use them for training. Each provider has its own data policies, so avoid
sending sensitive information. API keys remain in Render environment variables
and are not returned from health routes.
