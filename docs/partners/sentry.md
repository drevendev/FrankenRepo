# Sentry Agent Tracing — live linked spans

31 October 2026. The existing frankenrepo project receives explicit
`gen_ai.invoke_agent`, `gen_ai.execute_tool` and `gen_ai.request` spans. Actual
model IDs, tokens, latency, repair flag and known estimated cost are metadata;
unknown tokens/cost remain absent or null in receipts, never invented zeroes.

[Console observation](../eval/SENTRY_CONSOLE_VERIFICATION.json) confirms both
the initial Agent Activity and final SDK10.78 trace. The former shows Gemma's
exact model, two inference attempts and empty Input/Output panels. The final SDK
was selected after SDK11 introduced a vulnerable bundler dependency chain;
the final npm audit reports zero vulnerabilities. [Controlled failure](../eval/SENTRY_CONTROLLED_FAILURE.json)
is a synthetic optional-timeout diagnostic and is labelled as such.

Bootstrap initializes Sentry before Hono. `sendDefaultPii=false`, automatic
integrations disabled, metadata-only explicit spans, sanitized errors and
transaction fields; no cookie, Authorization, owner token, raw prompt, README or
private card body is captured. The existing Sponsored Business/pay-as-you-go $0
settings were not changed. Operator sampling is explicit; production sampling
defaults to 0.1. Console links require the owner's account and grant no access.
Final category review is deferred.

## 1 November submission addition

The owner explicitly authorized public disclosure of the sanitized Agent Activity screenshot. The screenshot and Best Use of Sentry Agent Tracing row were added to the [published article](https://dev.to/drevendev/i-gave-two-github-repositories-a-terrible-idea-then-i-gave-it-life-1ge9#seeing-the-ritual-in-sentry) after the deadline and labelled accordingly. The underlying trace was captured on 31 October. This completes the scoped local evidence review; organizer acceptance of the late category addition remains unconfirmed. [Public screenshot artifact](../submission/SENTRY_AGENT.jpg). The earlier deferred category-review note is superseded by this dated addition.
