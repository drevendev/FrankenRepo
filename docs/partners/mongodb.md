# MongoDB Atlas — implemented locally, public qualification pending

31 October 2026. Atlas is the canonical server-side archive and spending guard.
The existing private-card adapter now also owns signed-session-scoped durable
jobs, atomic reservations and immutable revision/publication rights. Credentials
and owner capabilities stay outside records exposed publicly.

[Live acceptance](../eval/ATLAS_V2_QUALIFICATION.json) covers reconnect/read,
wrong-key denial, publish/unpublish/delete, non-recreation after deletion and
20-way competing reservations. [HTTP acceptance](../eval/runs/2026-10-31T14-17-36-153Z-permissions.json)
reads an earlier card after an actual API process restart and checks explicit
consent and revocation. These are local API/Atlas receipts, not a hosted demo.

Existing FREE tier; 100 lifetime card slots at 40 kB each, 48 kB jobs with 24h TTL,
512 retained operation summaries, bounded reviews and notebook metadata. Capacity
reservations are conservative and do not automatically refund failed writes.
This limits app payload allocation below 10 MB; it does not claim the whole
512 MB cluster is unused or cap Mongo index/storage-engine overhead exactly.
Deleted payloads are removed, while minimal hashed capability tombstones prevent
old operations recreating them. Notebook tombstones precede external deletion.
Public gallery remains disabled. Owner category approval and Render acceptance
are deferred; no network allowlist or cluster settings were widened.

## 1 November submission evidence review

The owner authorized checking intended eligible categories and publishing. The completed local scenario above was reviewed against the official category description and included in the DEV submission. This supersedes the earlier deferred category review only for that bounded local scenario. It does not establish a public hosted application, complete the remaining update, or predict judge acceptance.
