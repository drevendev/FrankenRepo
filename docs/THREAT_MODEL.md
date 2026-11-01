# Threat model and current boundaries

Untrusted inputs are GitHub references/README, model and reviewer output,
anonymous requests, browser excerpts and imported recovery files.

| Threat                       | Boundary                                                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| SSRF / donor execution       | Strict public GitHub refs, fixed REST endpoints, redirects rejected, no clone/install/shell/donor code execution                          |
| Prompt injection             | Bounded data envelopes, no model tools or secrets, strict output/evidence checks; reviewer advice is also untrusted                       |
| Semantic overclaim           | Specific lineage/tragedy regressions; broad factual grounding still needs review and is not solved                                        |
| XSS / SVG injection          | React text, escaped certificate SVG, no raw donor/reviewer HTML                                                                           |
| Duplicate spend              | Atomic Mongo scope/key/fingerprint reservations before provider attempts; unknown holds its reserve; no automatic network retry           |
| Denial of service            | 20 kB JSON requests, capped source streams/tokens/input, timeouts, signed session limits and conservative socket bucket                   |
| Cookie reset / forged IP     | Global budgets and model concurrency independent of cookies; forwarding headers ignored                                                   |
| Private card disclosure      | Hashed high-entropy owner capabilities, Authorization only, no-store responses, recovery file kept local                                  |
| Public projection            | Separate explicit consent, no owner capability/private revision context/job metadata, unpublish and deletion tombstones; gallery off      |
| Memory revocation            | Mongo tombstone and consent manifest checked at retrieval; bounded manual outbox for provider deletion, pending status available to owner |
| Credential/telemetry leakage | Server-only environment, sanitized upstream errors, metadata-only manual Sentry spans, no body/header/README capture; artifact scan       |

Origin allowlist and JSON-only POST protect the browser surface but do not
establish human identity. HttpOnly/SameSite session cookies require a stable
random secret; changing it changes visitor scope. Global spending caps do not
reset when a guest clears a cookie. A direct client can make new sessions, so
per-session limits alone are not a billing boundary.

Mongo must reserve before new inference. One stopped worker is interrupted,
not a durable-resume promise; unknown attempts are not refunded or auto-retried.
Jobs expire after 24 hours, operation summaries are retained up to a bounded
ledger capacity, and deleted payloads leave minimal hashed-capability tombstones.
Actual Render allowlist/proxy behavior remains owner-dependent acceptance.

Backboard private-card upload is never implicit. Its public lesson corpus is
unapproved and disabled. Reviewer output can hallucinate; a completed revision
in this task did not improve quality. Tinker serving is off; its prepared pilot
has no human-approved labels, trained checkpoint or validated gain.

Downloaded/publicly copied exports cannot be recalled by unpublishing. Owner
capabilities can be used by anyone who obtains them; recovery files must stay
private. Server removal revokes canonical reads and related memory references;
remote memory deletion is separately confirmed. No unlimited retention/erasure
or exactly-once provider billing guarantee is claimed.

Default model remains disabled. Free/promotional eligibility does not permit a
card, paid subscription, own payment or automatic upgrade. See the dated
[receipts and deferrals](partners/UPDATE_RESULT_RU.md).
