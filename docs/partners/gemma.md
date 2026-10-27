# Gemma — verified local scenario

Verified completion: 28 October 2026, 00:31 Asia/Nicosia.
Provider/model: Cloudflare Workers AI / @cf/google/gemma-4-26b-a4b-it.
Purpose: turn two bounded, source-linked public donor genomes into a fictional
monster personality. Gemma supplies the actual creative output in the game.

## Sanitized evidence

[Raw saved browser receipt](../eval/runs/2026-10-27T22-30-53-177Z-cursed-browser.json)
contains the unchanged validated draft, actual donor evidence, source commits,
model/prompt ID, state observations, timestamps and artifact paths. No token,
Account ID, private code or provider error body appears in it.

[Exported card](../eval/runs/2026-10-27T22-30-53-177Z-cursed-browser.png) and
[actual UI](../eval/runs/2026-10-27T22-30-53-177Z-cursed-browser-certificate.png).

Scenario: inspect pallets/flask + jqlang/jq, select Cursed, pull the lever,
receive The JSON-Wrapped Serpent of Pallets, follow source links, export
PNG/SVG/alt text. The real browser flow took 8.258 seconds after browser launch
including inspection/export; provider-only latency was not measured. No fixtures.

## Qualification and limitations

Local invocation and exports are verified. Public demo: false. Render hosting:
unverified. Useful/Chaotic live outputs: not run. Creative usefulness and humor
need wider review; the first useful mutation is broad fictional flavor.

Owner reports Workers Free and authorized these credentials. No billing/card
changes occurred. Exact upstream attempt count (bounded at two), usage/Neurons
and billing dashboard were not captured. No immutable served model digest or
provider request ID was captured. Do not infer unlimited free capacity.

Setup: docs/CLOUDFLARE_SETUP_RU.md. Reproduce deliberately with the server running:
node scripts/verify-live-browser.mjs. This consumes another real free-quota run.
Removal: set MODEL_PROVIDER=disabled, restart API and optionally revoke the token.
No provider SDK or public browser credential is required.

## Useful/Chaotic review — 28 October 2026

Six additional real rituals compare prompts v1/v2/v3 on the same Flask/jq pair.
The final v3 modes both name the parents' distinct roles and avoid inline citation
codes; Chaotic additionally creates an absurd physical scene. Novelty is modest.
[All outputs, timings and editorial limits](../eval/INHERITANCE_REVIEW.md).
Current-v3 Cursed is not separately verified. No new partner categories or public
hosting are claimed. Reproduce one selected mode with node scripts/verify-live-browser.mjs useful
(or chaotic); each invocation is a fresh model call, not replay.
