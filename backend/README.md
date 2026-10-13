# Saint Augustine AI backend

Zero-dependency Node.js service that sends chat requests to Amazon Bedrock first
and automatically falls back to the curated OpenRouter free models if Bedrock
cannot answer. Provider credentials stay on the server; they are never sent to
the browser. Daily saint reflections use the same provider order.

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
| `AWS_BEARER_TOKEN_BEDROCK` | — | Amazon Bedrock API key. Set it in Render's secret environment settings. `BEDROCK_API_KEY` is also accepted as an alias. |
| `AWS_REGION` | `us-east-1` | Bedrock region used by the default endpoint. |
| `BEDROCK_MODEL_ID` | `nvidia.nemotron-super-3-120b` | Primary Bedrock model ID. Choose a model available in the selected region that supports Chat Completions and streaming. |
| `BEDROCK_BASE_URL` | `https://bedrock-runtime.<region>.amazonaws.com/openai/v1` | Optional Bedrock API base URL override. The server appends `/chat/completions`. |
| `BEDROCK_TIMEOUT_MS` | `20000` | Max time waiting for Bedrock response headers before trying OpenRouter. |
| `BEDROCK_STREAM_START_TIMEOUT_MS` | `7000` | Max time waiting for the first Bedrock stream bytes before trying OpenRouter. |
| `OPENROUTER_API_KEY` | — | OpenRouter fallback key. Required for failover. |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | Optional OpenRouter URL override, used by the self-contained backend checks. |
| `SYSPROMPT_CACHE_MS` | `120000` | Cache duration for the model picker list. |

Bedrock charges for model inference. Review the model's current rate and set an
AWS budget alert before enabling the key. Never commit provider keys or put them
in frontend configuration.

## Routes

| Method | Route | Notes |
| --- | --- | --- |
| GET | `/api/health` | Liveness probe. |
| GET | `/api/healthz` | Liveness probe used before chat sends. |
| GET | `/api/models` | Bedrock primary option followed by OpenRouter fallback choices. |
| GET | `/api/readings` | Best-effort daily Mass readings. |
| GET | `/api/saint` | Saint of the day and its reflections. |
| POST | `/api/chat` | Streaming chat; forwards answer text only and discards reasoning. |
| POST/GET | `/api/feedback` | Category-only feedback; never stores conversation text. |

## Provider order

1. The browser can choose the Bedrock primary or nominate a preferred
   OpenRouter backup. The server accepts only these known IDs; callers cannot
   use this public endpoint to proxy arbitrary paid models.
2. When `AWS_BEARER_TOKEN_BEDROCK` is configured, chat and generated saint
   reflections go to the configured Bedrock model first. The primary uses
   Amazon Bedrock's OpenAI-compatible Chat Completions endpoint and preserves
   the existing stream format.
3. If Bedrock errors, times out, or returns an invalid stream before the app
   starts streaming to the browser, the server tries the chosen OpenRouter
   backup, then the remaining curated OpenRouter models.
4. If the Bedrock key is absent, the backend continues with OpenRouter so an
   incomplete deployment can still serve the previous behavior. Configure the
   Bedrock key in Render before considering Bedrock active as primary.

The OpenRouter model list is cached and used for backup choices. If OpenRouter
is temporarily unable to list models while Bedrock is configured, `/api/models`
still returns the Bedrock primary option.

## Data and credentials

Conversation history is stored in the browser. A message sent for a reply is
transmitted from the browser to this backend and then to Amazon Bedrock; if
Bedrock cannot answer, it can be sent to OpenRouter as the backup. Each provider
has its own data policies, so avoid sending sensitive information. The API keys
remain in Render environment variables and are not returned from health routes.
