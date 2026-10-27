# Real model runs — updated 2026-10-28

**Seven successful real browser rituals through Chromium → Node API → Cloudflare Gemma.**

The first Cursed v1 run is documented below. Six further Useful/Chaotic runs compare
v1, v2 and final v3 prompts. [Full inheritance review and every artifact](INHERITANCE_REVIEW.md).
Final v3: [Useful](runs/2026-10-27T22-54-55-349Z-useful-browser.json) ·
[Chaotic](runs/2026-10-27T22-55-05-380Z-chaotic-browser.json).
Current v3 Cursed has not been rerun.

## First Cursed run — historical receipt

- Model: @cf/google/gemma-4-26b-a4b-it, provider cloudflare, prompt frankenrepo/prompt/v1.
- Inputs: pallets/flask + jqlang/jq, fresh bounded public GitHub observations.
- Result: **The JSON-Wrapped Serpent of Pallets**.
- Start/end (UTC): 2026-10-27T22:30:53.177Z → 2026-10-27T22:31:01.862Z.
  Local completion: 28 October 2026, 00:31:01 Asia/Nicosia.
- Measured browser verification flow: 8,258 ms after browser launch, including
  inspection, generation observation and export. This is not provider-only inference latency.
- Observed polling transitions: queued → splicing → completed. Faster intermediate
  stages were not captured by polling and are not presented as measured.
- Schema/evidence validation, source/commit references, saved content hash,
  PNG/SVG/alt-text exports and screenshot passed. No JavaScript page errors.
- No replay, fixture interception, manual rewriting or substitute model.

[Unchanged JSON receipt](runs/2026-10-27T22-30-53-177Z-cursed-browser.json) ·
[PNG card](runs/2026-10-27T22-30-53-177Z-cursed-browser.png) ·
[SVG card](runs/2026-10-27T22-30-53-177Z-cursed-browser.svg) ·
[Actual UI capture](runs/2026-10-27T22-30-53-177Z-cursed-browser-certificate.png).

## Scope and limitations

For the first receipt below, one completed Cursed ritual was verified. Each ritual allows at most one repair, but the
exact number of upstream attempts and provider token/Neuron usage were not
instrumented. No immutable Cloudflare weight digest or provider request ID was
returned in the saved browser record. The model ID identifies the requested
hosted model. User-reported Workers Free/no-card setup was used without billing
changes; the billing dashboard was not inspected.

Both donor domains are recognizable (small web applications and JSON processing),
including their Python/C language observations. The generated useful mutation is
generic and uses fictional hyperbole about perfect output. It is not evaluated
technical guidance or evidence of feasibility. Humor/quality has not been blindly
scored; Useful/Chaotic have since been run as documented in INHERITANCE_REVIEW.md.
The larger ten-pair × three-mode evaluation remains unrun. Do not turn a schema pass into a quality benchmark.

## Reproduce deliberately

Start the configured local API, then run:

```sh
node scripts/verify-live-browser.mjs useful
node scripts/verify-live-browser.mjs chaotic
```

This makes a NEW real provider call (with at most one repair); it does not replay
the saved card. It writes timestamped receipts/exports, including failure details,
and uses no mocks. Local operator CLI verification is also available:

```sh
npm run test:live -- pallets/flask jqlang/jq cursed
```

These commands consume the authorized free quota. No automatic batch of extra
modes was run for this first verification.

## Prior state

On 27 October initialization, no Ollama runtime/model or authorized Cloudflare
configuration was available, and test:live stopped with model disabled. Those
were truthful historical blockers. On 28 October the owner supplied .env and
explicitly authorized this actual run. No credentials were copied into the receipt
or committed. The illustrated idle specimen and test fixtures remain distinct
from this real generated result.
