# Backboard — implemented, owner-dependent live work deferred

31 October 2026. Backboard is a semantic index of approved lessons, not a second
copy of private cards. Mongo owns consent and the canonical text. Every returned
memory ID is checked against an approved/consented/non-revoked manifest; only
two bounded notes may reach Gemma. Provider-returned text cannot override it.

Server adapter and operator `seed/search/delete/drain` commands are present.
Tombstones deny retrieval before the bounded outbox requests remote deletion.
No public seed endpoint, automatic chat/model routing, scheduler or private-card
upload. The [six-note proposal](NOTEBOOK_CORPUS.json) is **not approved or seeded**.
The owner deferred required review; a disposable unapproved test write was also
rejected by automatic approval review and was not executed.

Live read-only balance remains $4.967132 free, paid/subscription $0, no card,
auto-reload false. Authenticated Billing/Starter estimator showed Memory Lite and
RAG $0.0039/op; conservative reservations use $0.02/query and $0.05/manual write,
total cap $1. The dated pricing check expires after one week and needs explicit
operator maintenance. Write/search/restart/delete and context influence remain
unverified. No inference, learning or contest qualification is claimed.
