# Initialization validation — 2026-10-27

Environment: Windows, Node 24.19.0, npm 11.17.0. No remote CI run is claimed.

| Check                                                             | Observed result                                                              |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| npm run typecheck                                                 | Passed                                                                       |
| npm run lint                                                      | Passed after control-character normalization cleanup                         |
| npm run format:check                                              | Passed                                                                       |
| npm test                                                          | 57 tests passed                                                              |
| npm run build                                                     | Vite production web + bundled Node API passed                                |
| npm run check:bundle                                              | 103,260 gzip bytes of JS (Node gzip, all chunks); below 250,000 target       |
| npm run test:e2e                                                  | 8 passed on desktop 1440 and mobile 375; 320px width also checked            |
| node scripts/license-inventory.mjs                                | 217 lock records, zero unknown license metadata                              |
| npm audit --audit-level=high                                      | Zero reported vulnerabilities                                                |
| node --import tsx scripts/inspect-live.ts pallets/flask jqlang/jq | Real anonymous GitHub reads passed; exact evidence in eval/GITHUB_SMOKE.json |
| npm run test:live                                                 | Exit 2, model disabled; zero model calls                                     |
| Fresh dependency install/build                                    | npm ci, full verify and 8 browser tests passed in isolated source copy       |

Browser success/error tests use explicit fixtures: no live model result is
claimed. Default screenshots show the actual model-disabled application and
its labelled illustrated specimen. PNG, SVG and alt text downloads succeeded;
the downloaded fixture PNG was visually inspected for text, artwork and layout.
Keyboard focus/radio selection, sound off, reduced motion, source disclosure,
private/missing source, provider quota, offline API and literal HTML handling
were exercised. Playwright ran Chromium; Safari/Firefox are not verified.

The final Cloudflare adapter adds a documented chat-completion envelope regression, JSON-object output validation, disabled thinking and truncation handling. This is mocked contract coverage, not a live Cloudflare receipt.

A real Chromium → local API → GitHub inspection also passed for pallets/flask and jqlang/jq with no page errors: eval/HTTP_SMOKE.json and images/inspection-live-desktop.png.

The first browser run failed all eight scenarios because the API origin allowlist
blocked its own static assets. Corrected local production origins and a regression
assertion fixed the issue. Formatting also exposed a misplaced ESLint directive;
Unicode control-class normalization removed the fragile suppression. Final
checks supersede those failed development runs; failures were not hidden.

Not verified: real Gemma, actual inference latency/quality, permanent storage,
public gallery consent/removal, optional partner calls, live hosted demo, external
independent user, 45–60s genuine AI recording, published article, remote GitHub CI.
Corresponding endpoints/integrations are disabled or absent.

## Laboratory atmosphere update — 2026-10-27

- npm run verify passed: strict types, lint, formatting, all 57 core/API tests
  and production build.
- npm run test:e2e passed all 12 desktop/mobile Chromium scenarios.
  The added tests use the browser's actual AudioContext, count lazy creation
  and oscillator scheduling, and verify mute/unmute reuse, music/volume controls,
  hidden-tab suspension, keyboard dismissal and animation pause/reduced motion.
- Updated desktop/mobile default screenshots were visually inspected. The audio
  settings panel was also inspected. There is no Safari/Firefox listening test,
  calibrated sound-pressure measurement or real Gemma evidence in these checks.
- Built web JavaScript: 106,467 gzip bytes (Node gzip, all chunks), below 250,000.
  No new npm dependencies, external recordings, paid services or account
  activation were needed for sound and decorative effects.
- Added docs/CLOUDFLARE_SETUP_RU.md using current official account/token/model
  and pricing instructions. No token was created or credential read/used.
