# Specification and initialization source

Owner-authorized implementation contract: ../FrankenRepo_SPEC_v1.0.md,
FR-W4-001, 2026-10-27. The full local specification was read before coding.

- [Canonical specification](https://docs.google.com/document/d/1nusYn8SZPI9whHG8-iqyqYEvhZO4x0ifDx-3x_JkKAQ/edit)
- [Canonical initialization prompt](https://docs.google.com/document/d/1lOGuqednkHBbDyOyWM9BXrzJAaEs3JoNirRDUjEmleM/edit)

The initialization file mentioned by the owner was absent locally. The handoff
README identified its canonical Google Doc; the connected Google Drive read
retrieved it and restored FrankenRepo_CODEX_INIT_v1.0.md unchanged in substance.
Existing specification and handoff files were preserved. No Drive content was edited.

## Deliberate implementation choices and staged gaps

Source publication is now owner-authorized: [public repository](https://github.com/drevendev/FrankenRepo),
first preview version 0.1.0. Known implementation/qualification gaps have
[tracked issues](KNOWN_ISSUES.md). This is separate from application deployment.

- Hono selected for the Node API. The post-deadline source update adds real Mastra steps,
  with a legacy runner option, and retains the provider ports.
- Mongo-backed jobs use twenty-four-hour TTL and durable idempotency/budget
  reservations. Legacy test-only memory jobs retain their fifteen-minute TTL.
- The illustrated idle specimen is artwork, explicitly labelled. Genuine model artifacts now exist as dated evaluation files, but no
  recorded/replay mode is offered in the app.
- First real Cursed browser/API flow succeeded on 2026-10-28 Asia/Nicosia.
  Useful/Chaotic v3 and a Chaotic v4 repeat now also have real browser receipts,
  including the HungryCrab/fly and Scriptorium/kinship pairs and editorial reviews.
  Larger evaluation and public challenge acceptance remain unverified.
- Explicit origin allowlist, signed HttpOnly/SameSite guest sessions and global
  Mongo limits coexist with a conservative socket-address request bucket.
  Forwarding headers are ignored; Render proxy/allowlist acceptance remains pending.
- Durable reservations retain unknown outcomes. A stopped worker is interrupted,
  not automatically resumed or refunded; no exactly-once billing guarantee.
- Private capability reads and consented public projections/removal are implemented
  with real Atlas receipts. Gallery/moderation remain disabled; public deployment
  and owner-dependent corpus/training approval remain deferred. Six bounded local
  scenarios were reviewed for the owner-authorized article; this does not certify
  judge acceptance or a hosted application.
- The real 52-second local Gemma recording and the DEV article were published
  before the deadline. The Sentry screenshot/category addition and this source
  publication are afterward; [README](../README.md#post-deadline-source-update--1-november-2026)
  and [publication record](submission/PUBLISHED.json) distinguish them.

The canonical specification and initialization file remain unchanged. The dated
[update result](partners/UPDATE_RESULT_RU.md) records implementation and failures;
it does not retroactively change the initial contract or public release evidence.
