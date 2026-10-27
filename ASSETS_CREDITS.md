# Asset and source credits

All monster SVG paths, six palettes, six body shapes, six heads, five accessories,
four expressions, laboratory drawing, typography treatment, CSS and optional
synthesized oscillator sound were created for FrankenRepo in this implementation.
The haunted music-box motif, organ drone, bubble/switch/scan/electric/reveal
effects, fireflies, steam, phantom and instrument animations are original
procedural compositions and artwork, also under MIT. Web Audio generates the
score locally after opt-in; no external music recordings or audio services are used.
Original artwork and audio are covered by the repository MIT license. No external
images, SFX recordings, model image generator or private portfolio source are bundled.

Custom typography is self-hosted, with no Google Fonts/CDN request at runtime:
Creepster (Sideshow / Font Diner) for the haunted display lettering, and IM Fell
English (Igino Marini) for readable old-book serif type. Unmodified Latin WOFF2
files came from @fontsource/creepster and @fontsource/im-fell-english, version 5.3.0.
Both are SIL Open Font License 1.1, separate from MIT. Complete supplied licenses
are in apps/web/public/fonts/OFL-Creepster.txt and OFL-IM-Fell-English.txt.
docs/FONT_SOURCES.json records exact package URLs, file sizes and SHA-256 hashes.
Portable SVG/PNG exports retain their system serif rendering; they do not depend
on an external font server.

React/React DOM, Vite, Hono, Zod and other installed packages keep their own license
files in npm distributions. Playwright is Apache-2.0. Full pinned dependencies are
recorded in package-lock.json. See docs/DEPENDENCIES.md.

Public portfolio READMEs informed design principles only; no code/assets were
copied and none of those tools were executed. See docs/REUSE.md for read evidence.
Model weights are not distributed. Gemma/provider terms must be checked by the
operator before enabling an actual model.
