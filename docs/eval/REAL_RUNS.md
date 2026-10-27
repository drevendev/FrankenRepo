# Real model runs — 2026-10-27

**BLOCKED. Successful real Gemma calls: zero.**

No Ollama executable was on PATH or in the standard inspected Windows install
locations. Loopback 127.0.0.1:11434 refused the connection after the sandbox's
initial socket restriction was bypassed for verification. Inspected default
manifest directories contained no model manifests. No model weights were
downloaded and no existing private project runtime was modified.

No authorized Cloudflare account/token/free-model proof was supplied or used.
npm run test:live stopped with exit 2 (MODEL_PROVIDER=disabled) before any model
request. The selected Cloudflare Gemma ID is confirmed in the public Free-plan
documentation, but has not been invoked using this owner's account.
See ../MODEL_DECISION.md.

The UI's idle specimen is labelled illustrative. Tests use deterministic explicit
TEST FIXTURE provider responses. Neither is a model recording. No replay artifact
or real-model quality evaluation exists.

## Next real verification

Configure an explicitly authorized local installed Gemma model, then run:

```sh
npm run test:live -- pallets/flask jqlang/jq cursed
npm run test:live -- pallets/flask jqlang/jq useful
npm run test:live -- pallets/flask jqlang/jq chaotic
```

Each actual attempt records start/end, elapsed wall time, exact model ID, installed
Ollama digest when available, mode, input references and success/failure under
runs/. Do not edit model prose to manufacture a passing recording.
After review, document recognizable contribution of both parents, humor,
coherence and limitations. A larger ten-pair × three-mode blinded eval remains
unrun. Real GitHub-only smoke evidence is separate: GITHUB_SMOKE.json.
