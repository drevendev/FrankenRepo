# Model decision — 2026-10-27

Owner preference: choose the most effective route for the Hacktoberfest entry.
Selected primary target: **Gemma 4 26B A4B IT on Cloudflare Workers AI**,
exact ID @cf/google/gemma-4-26b-a4b-it. Local Ollama is the development fallback.
MODEL_PROVIDER remains disabled until actual account access is authorized and configured.

This is an engineering choice, not a measured quality/latency ranking or a
promise of a contest win. Hosted server-side inference lets a guest complete the
browser game without installing a model. It fits the owner's open-weight core
and can be demonstrated together with a genuinely deployed Render application.
Optional partner expansion still follows the first real successful game loop.

## Current official evidence

- [Cloudflare model catalog](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/) lists the exact model and chat-completion output.
- [Free-plan eligibility](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/) explicitly lists this Gemma model as available on Workers Free.
- [Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) lists 10,000 free Neurons/day; Free requests fail beyond the allowance. Paid plans charge above it.
- [Getting started](https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/) documents enable_thinking=false for this model.
- [Cloudflare integration changelog](https://github.com/cloudflare/langchain-cloudflare/blob/main/CHANGELOG.md) records JSON-object mode for Gemma structured output. FrankenRepo validates its strict Zod schema after receiving it.

Public eligibility is confirmed in documentation. This owner's account access,
no-card setup, effective quota and actual successful call are **not verified**.
No account was created, credentials used, billing method added or provider invoked.

## Activation handoff

The owner supplies an existing authorized Workers Free account and least-privilege
Workers AI token via local .env, without posting the token in chat. Set
MODEL_PROVIDER=cloudflare, CF_ACCOUNT_ID and CF_API_TOKEN; retain the exact model ID.
Do not upgrade, add payment or enable paid gateway credits. Restart the local API.

Run npm run test:live -- pallets/flask jqlang/jq cursed, then useful and chaotic.
Review both-donor recognizability, humor, coherence, actual latency and failures.
Keep unchanged receipts. Only after these succeed should Gemma become VERIFIED.
Render additionally needs owner-authorized deployment and its own successful
public-browser receipt. These categories are not interchangeable.
