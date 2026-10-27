# FrankenRepo

_Stitch two repositories. Summon something that should not exist._

A small gothic browser laboratory: inspect two public GitHub repositories, use
a configured Gemma model to invent a fictional creature, then download its
Monster Birth Certificate. Observed facts stay linked to their sources.
The creature is an imaginative interpretation, not a judgment of a project.

**Local foundation implemented; live Gemma generation is not yet verified.**
The default lab honestly reports that its model is unavailable. No recorded
Gemma output, persistent gallery, public repository or deployment is supplied.

![The actual local laboratory with illustrated specimen, model disabled](docs/images/lab-desktop.png)

The creature above is an illustrated specimen, not model output.
[Mobile capture](docs/images/lab-mobile.png).
[Actual live GitHub inspection](docs/images/inspection-live-desktop.png).

## First run

Use Node **24** and npm **11**. In this project directory:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. Choose **Use sample donors**, then **Inspect donors**.
This makes real anonymous GitHub API calls; network access and GitHub quota are
required. Swap donors or enter another public owner/repo pair.
A missing model never produces a fabricated creature.

For a production build served locally on **http://127.0.0.1:3001**:

```sh
npm run build
npm start
```

No accounts, keys or model downloads are needed to open the UI. Optional sound
starts off. Only the model-generated certificate offers PNG, SVG and alt-text
exports. Test fixture output is confined to tests.

## Enable real local Gemma

For the public contest demo, the selected primary target is
[Cloudflare-hosted Gemma 4 26B A4B IT](docs/MODEL_DECISION.md). Its public Free-plan
eligibility was checked; this account's access and real inference are still
unverified. The local Ollama setup below is the fallback.

1. Install/start Ollama separately and explicitly select/download a Gemma model
   appropriate for your machine. FrankenRepo never downloads weights itself.
2. Copy .env.example to .env. Set MODEL_PROVIDER=ollama and OLLAMA_MODEL to the
   exact installed model name (example: gemma3:4b). Leave the loopback base URL.
3. Restart the API, select donors, inspect, and pull the lever.
4. Capture actual model evidence:

```sh
npm run test:live -- pallets/flask jqlang/jq cursed
```

Repeat with useful and chaotic when the first call succeeds. Receipts go under
docs/eval/runs/ and include actual model, installed digest, input pair, timings
and result/failure. Review humor and recognizability manually; schema validity
does not establish creative quality. See [real-run status](docs/eval/REAL_RUNS.md).

Cloudflare is an alternative server adapter, not an activated service.
Only use an explicitly authorized account with confirmed free/no-card access:
set MODEL_PROVIDER=cloudflare, CF_ACCOUNT_ID, CF_API_TOKEN and the exact
CF_GEMMA_MODEL. Provider availability and this spec's preferred model have not
been verified for an account. No credentials are bundled or read from other projects.

## What is implemented

| Area          | Current behavior                                                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub        | Strict reference parser, fixed public REST endpoints, max four calls/donor, size/time caps, ETag + bounded cache, source links, honest missing data |
| Model         | Disabled / Ollama / Cloudflare, server-only, strict JSON + evidence validation, one repair maximum, daily process cap                               |
| Game          | Three prompt styles, deterministic original layered SVG, reveal/skip, muted synthesized sound, responsive keyboard/reduced-motion UI                |
| Certificate   | Source-aware traits, first words, speculative useful mutation, PNG/SVG + alt text + copied share text                                               |
| Jobs          | Actual stages, scoped idempotency, quota/concurrency caps, cancellation, fifteen-minute ephemeral TTL                                               |
| Persistence   | Disabled; no public gallery, sharing link, account, voice or breeding                                                                               |
| Qualification | Zero verified partner categories; real GitHub smoke passed, real Gemma blocked                                                                      |

## Verification

```sh
npm run verify
npx playwright install chromium
npm run test:e2e
```

Browser tests use explicit test provider fixtures for the success path and
must not be described as real Gemma runs. Screenshots show the actual default UI.
[Validation results](docs/VALIDATION.md) · [architecture](docs/ARCHITECTURE.md) ·
[security](docs/THREAT_MODEL.md) · [deployment handoff](docs/DEPLOYMENT.md) ·
[partner status](docs/partners/STATUS.json) · [submission draft](docs/submission/DEV_DRAFT.md).

MIT source. Dependencies/model terms are separate. [Credits](ASSETS_CREDITS.md).
