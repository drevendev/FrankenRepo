# Architecture

Browser → same-origin Hono API → fixed public GitHub REST + configured Gemma.
Production build serves the Vite assets from the same Node process.
Development Vite proxies API and capability checks to loopback port 3001.

| Boundary          | Responsibility                                                       |
| ----------------- | -------------------------------------------------------------------- |
| apps/web          | UI, accessibility, image download, state/error presentation          |
| apps/api          | Body limits, typed errors, origins, anonymized-IP request budgets    |
| packages/core     | Input/schema contracts, fixed evidence validation, deterministic SVG |
| packages/adapters | Streaming HTTP caps, GitHub snapshots/cache, server model requests   |
| packages/ritual   | Real job states, request deduplication, bounded repair, cancellation |
| scripts           | Explicit operator-only GitHub/model verification receipts            |

Inspection requests fetch metadata, then languages/commit in parallel, then a
README pinned to the observed SHA when available. Four requests maximum,
eight-second timeout and 100 kB response cap for each. README is a 1,500-character
text excerpt. No code clones or repository installs. Cache: 128 donors,
twelve-hour TTL; 512 bounded conditional ETag responses. Empty/missing information
stays UNKNOWN/PARTIAL. GitHub API license metadata is an observation, not a
completed reuse-license audit.

Gemma receives only bounded evidence values and identifiers inside a JSON data
envelope. The system prompt treats them as untrusted; the model gets no tools,
tokens, source URLs or authority to write facts. Strict Zod objects reject extra
fields, unavailable evidence, missing parent roles, digits/URLs/HTML in generated
prose. One repair is allowed for invalid output; transport/quota failures do not
automatically retry. The model cannot select IDs, dates, provenance or publication.

The runner produces UUID jobs, scopes access/idempotency to a salted socket-IP
bucket, stores at most 100 ephemeral jobs, expires after fifteen minutes and
aborts cancelled calls. Same key/different inputs is a conflict. At most one
ritual runs by default. Job failure contains no creature. Model calls are capped
at twenty per UTC day per process, including repairs; restarts reset this cap.

All storage and optional providers are disabled. No URLs are advertised as
permanent. A completed certificate lives only in browser memory/current process
until downloaded. Downloaded SVG is standalone with escaped model text,
description/alt text, source URLs and model attribution. Canvas exports PNG.
Sound is an opt-in locally synthesized tone.
