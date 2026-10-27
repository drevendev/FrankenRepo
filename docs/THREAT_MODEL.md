# Threat model and current limits

Untrusted inputs: public repository references, GitHub metadata/README, model
output, anonymous API requests and browser text.

| Threat                      | Current boundary                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| SSRF / execution            | Strict GitHub-only regex; fixed api.github.com paths; redirects rejected; no clone/shell/donor install       |
| Prompt injection            | README stays data; model has no tools/secrets; strict schema and code-created evidence IDs                   |
| XSS / SVG injection         | React text rendering, encoded static SVG images, escaped certificate text; no raw donor HTML                 |
| Denial of service           | 20 kB JSON bodies, 100 kB streamed sources, timeouts, fixed tokens, request quotas, one generation at a time |
| Duplicate inference         | Scope + UUID idempotency key; conflict on differing payload; bounded TTL                                     |
| Leaked credentials          | Server-only environment, sanitized errors; no provider error bodies/stack logging or telemetry               |
| Public data disclosure      | No gallery, publishing, capability-token or permalink route implemented                                      |
| Forged client IP            | Forwarding headers ignored; direct socket address is salted/HMACed per boot                                  |
| Persistent false provenance | UUID/time/source created by server; model citations checked against actually read evidence                   |

Origin allowlist protects browser access and JSON POST prevents simple cross-site
forms. This is not user authentication. Random job IDs plus scope reduce accidental
job disclosure, but same-IP visitors are not separate identities; no personal
inputs are accepted. Per-IP state is process-local and expires. No raw IP is
stored in certificates.

Do not expose a reverse-proxied multi-instance service without reviewing trusted
client identity, aggregate quota persistence and provider free-tier hard limits.
Current quotas reset at process restart. Operator .env mistakes cannot guarantee
a free provider account; no account activation has occurred.

Body streams are size-bounded. Slow clients still rely on Node server request
timeouts. Model prompt defenses reduce risk, not a mathematical guarantee of
semantic truth or safe humor. Public gallery moderation and creator capability
abuse tests are deferred along with those absent endpoints. They are not claimed
as passed consent/storage features.

See tests/ for offline contract coverage and docs/eval/ for actual external evidence.
