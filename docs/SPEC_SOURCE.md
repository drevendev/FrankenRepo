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

- Hono selected for the Node API. Plain TypeScript orchestration precedes Mastra.
- Ephemeral jobs expire after fifteen minutes instead of a storage-backed
  twenty-four-hour job collection. The UI exposes no persistence claims.
- The illustrated idle specimen is artwork, explicitly labelled. No genuine
  recorded Gemma outputs existed, so no recorded/replay mode is offered.
- First real Cursed browser/API flow succeeded on 2026-10-28 Asia/Nicosia.
  Useful/Chaotic live runs, larger evaluation and public challenge acceptance
  remain unverified; optional partner SDK work follows this first live slice.
- Two local API/web ports share an explicit origin allowlist. Behind a hosted
  reverse proxy all visitors share the conservative socket-IP quota unless
  a separately reviewed trusted-proxy design is added.
- Per-process quotas/caches/idempotency are bounded but reset on restart.
  They are not a distributed billing guard. Do not scale publicly as-is.
- Default memory has no gallery or public/private monster read routes.
  Consent, capability-token, Mongo persistence and moderation work is deferred.
- The gameplay/end-to-end recording and article are preparation documents.
  No fake demo media or external publication is produced.
