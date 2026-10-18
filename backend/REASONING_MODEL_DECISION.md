# Default free reasoning model — 18 October 2026

Default: `liquid/lfm-2.5-2.6b:free` through OpenRouter, for chat and daily saint content.

The live catalog listed it at zero input/output cost, with mandatory reasoning,
a 65,536-token context, and JSON output support. Its public model page reported
229 tokens/second and 0.27-second P50 latency. These are OpenRouter aggregate
figures, not a benchmark of this deployment, and can change with free-tier load.

Other checked free routes included Inkling Small (103 tokens/second), North Mini
Code (65), Laguna XS (60), Dots3 Note (56), Nemotron 3.5 Super VL (52), Nemotron
3 Ultra (48), Gemma 4 26B (41), Nemotron 3 Super (41), Gemma 4 31B (26), Xing4.0
(22), and Nemotron 3.5 Lightning (5). Coding specialists and content moderation
models are unsuitable defaults for this general conversation product. Inkling
Small and Nemotron 3 Super are stronger free fallbacks.

Liquid is a small reasoning model. Its model card advises against knowledge-heavy
tasks and states that prompts/outputs may be retained and used for training.
The model picker and backend documentation disclose that tradeoff. Daily saint
content receives the complete sourced biography plus a reviewed Augustine passage;
it does not depend on the model inventing a historical connection from memory.

The reasoning config is `{ enabled: true, exclude: true }`. A zero price ceiling
and `:free` IDs prevent routing a free-model request to a paid variant. A 4,096
token minimum leaves room for private reasoning as well as the answer. The joint
saint feature uses 8,192 tokens: the live 4,096-token run exhausted its budget
before finishing JSON. Supported fallback controls use low effort for Inkling
and a 1,024-token private budget for Nemotron 3 Super. Inkling's free endpoint
returned 403 during deployment checks, so it is not treated as confirmed usable.
Quick/Thoughtful/Contemplative still control the visible answer through prompts.

The saint biography (240–320 target words) and Augustine connection (90–140)
are generated together, validated, coalesced across concurrent calls, and cached
by date/name/source fingerprint. Invalid or truncated content uses a free backup,
then configured provider fallbacks, and finally explicitly marked sourced text.

## Sources

- [Live model catalog](https://openrouter.ai/api/v1/models)
- [Liquid free route and limitations](https://openrouter.ai/liquid/lfm-2.5-2.6b:free)
- [Inkling Small free route](https://openrouter.ai/thinkingmachines/inkling-small:free)
- [OpenRouter reasoning configuration](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)
- Reviewed Augustine passages and links are versioned in `saint-context.js`.

No credentials were read, copied, added to the browser, or committed for this change.
