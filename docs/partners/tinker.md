# Tinker — prepared pilot, no training claim

31 October 2026. [Live preflight](../eval/TINKER_PREFLIGHT.json) confirms
`Qwen/Qwen3-8B` trainable and sampleable, 32K context, Apache-2.0 model terms,
current rates, $10 credits through 1 November 2027, auto-reload off and Free
checkpoint storage. The tokenizer was downloaded, not the model weights.

The pilot has 16 train / 8 validation / 12 holdout cases on three donor-disjoint
historical components. They are AI-drafted controlled editorial counterexamples
on actual snapshots, **not 36 real rituals or twelve independent holdout pairs**.
Rubric, config and splits were frozen before evaluation. [Human review file](../../tools/apprentice/data/REVIEW.html),
[manifest](../../tools/apprentice/data/manifest.json), [command](../../tools/apprentice/experiment.py).

One LoRA candidate, rank 8, two epochs, fixed last-epoch checkpoint, same baseline
prompt/decoding, macro-F1/schema/unsupported-claim confusion counts and tokens are
implemented in the isolated Python tool. An atomic reservation prevents rerunning
an uncertain experiment. Preflight upper estimate with margin is $0.17416282,
within cap $3; this is **an estimate**, not spending or successful training.

Owner deferred mandatory human labels. No baseline sampling, train call,
checkpoint, metric improvement or qualified sampler exists. Serving is off and
`TINKER_REVIEW_ENABLED=true` is rejected until that dependent integration is
qualified. No apprentice score is fabricated in the UI. A real failed experiment
would also remain evidence; success is not promised.

Before a future run, an operator must record a fresh (under one hour old)
`checkedAt`, `remainingCreditUsd`, `expiresAt`, `autoReload:false`, `hasCard:false`
and `checkpointPlan:free` observation in the excluded local billing file. A dated
preflight balance is not reused as proof of a fresh account balance.
