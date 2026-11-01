# Architecture

React/Vite -> same-origin Hono -> Mastra ritual -> fixed GitHub REST / Gemma /
optional approved context. One Node24 process serves production assets and API.
Core remains browser-safe. Mongo, OpenAI, Sentry and Mastra stay on the server;
Browserbase and Python/Tinker are explicit operator commands.

Inspection makes at most four fixed GitHub calls per donor, each bounded to
100 kB/eight seconds. A descriptive README excerpt is capped at 1500 characters,
excluding obvious badge/art/code lead-ins where possible, and pinned to observed
SHA. Unknown observations stay unknown. No donor code is installed or executed.

Mastra steps inspect donors, add context, generate/validate and reveal. Legacy
remains selectable. Framework retries are zero; invalid output can use one
explicit repair. A deliberate revision uses frozen genomes and an immutable
original link. Initial + repair OR initial + revision is the allowance. Mastra
does not provide durable resume or Temporal semantics here.

One Mongo CAS document atomically reserves scope/key, canonical fingerprint hash,
calls, estimated ceiling and provider concurrency before spend. At most 512
operation summaries retain unknown/expired attempts; operator review is needed
at capacity. UTC daily Gemma reservations cap at 20, one active action, three
starts per visitor/15 minutes. A stable HMAC secret signs HttpOnly/SameSite
cookies. Global budgets do not depend on visitors keeping cookies. Forwarding
headers are ignored; a separate socket bucket is conservative behind proxies.
CLI live evaluation uses the same durable controls.

Jobs are bounded to 48 kB and TTL 24h. Up to 100 lifetime card slots at 40 kB,
bounded reviews/notes and the fixed ledger keep app payload allocation below
10 MB; database/index overhead is not measured by that payload cap. Mongo outage
prevents new spend. Worker interruption never refunds uncertain attempts.
Confirmed completed records can be read after restart.

Private saves return a high-entropy owner capability; only its hash is stored.
Recovery JSON stays local; tokens travel only in Authorization. Public sharing
defaults off, needs explicit consent and serves a no-store projection. Private
revision context, job metadata and capabilities are stripped. Unpublish revokes
public reads. Delete removes payloads and retains a minimal hashed-capability
tombstone against replayed saves; job/review payloads are redacted. Gallery stays
off without moderation/acceptance.

Backboard may search three results and supply two approved canonical notes,
checked again in Mongo. Revoked IDs never enter prompts, even while a manual
bounded deletion outbox is pending. Its corpus is not approved or seeded.
Ultramarine is an opt-in schema/evidence-checked opinion, never a feasibility
certificate. Tinker has a prepared pilot/preflight with serving disabled.

Sentry initializes before Hono with automatic integrations disabled. Linked AI
spans contain model IDs, timings and known usage. Prompts, README, private text,
cookies and capabilities are excluded. Browserbase research is opt-in, fixed-host,
pinned-SHA and separately labelled. Public E2E requires a real Render URL.

The original SVG kit and exporter remain deterministic and escape model text.
Sound stays opt-in, using one lazy AudioContext which pauses when hidden. Motion
controls/reduced-motion cover decorative animation. Real job states drive
progress; no fabricated percentages or replacement specimen.

See [dated receipts, costs and deferrals](partners/UPDATE_RESULT_RU.md).
