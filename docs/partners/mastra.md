# Mastra — real ritual workflow

31 October 2026. Pinned `@mastra/core` 1.81.0 executes donor inspection, approved
context, Gemma/contract validation and reveal as real steps. The existing provider
ports remain server-only; `ORCHESTRATOR=legacy` is retained for comparison.
Framework retries are zero. Only invalid model content can use the one explicit
repair; uncertain transport/storage outcomes never silently repeat inference.

The [Chaotic receipt](../eval/runs/2026-10-31T14-30-13-808Z-chaotic-browser.json)
contains actual engine/run ID and per-step timings. [Useful failure](../eval/runs/2026-10-31T14-30-38-334Z-useful-browser.json)
preserves an unsuccessful run; later error propagation retains safe source error
codes rather than collapsing them to a generic framework error. Fixture tests
cover cancellation separately and are not external model evidence.

Mastra makes the source/context/model boundary inspectable in Sentry and the
record. Mongo handles durable idempotency; this is not Temporal-style resume.
No Mastra Cloud signup, spend or scheduler. Final contest approval is deferred.
[Official workflow API](https://mastra.ai/docs/workflows/overview) was checked
before adding the pinned dependency.

## 1 November submission evidence review

The owner authorized checking intended eligible categories and publishing. The completed local scenario above was reviewed against the official category description and included in the DEV submission. This supersedes the earlier deferred category review only for that bounded local scenario. It does not establish a public hosted application, complete the remaining update, or predict judge acceptance.
