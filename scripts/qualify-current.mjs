import { spawnSync } from 'node:child_process';
// Exactly one run of each required mode after the safety revision. No retries,
// model search, training, review calls or infinite evaluation campaign.
const pairs = [
  ['chaotic', 'drevendev/HungryCrab', 'DenisSergeevitch/desktop-fly'],
  [
    'useful',
    'drevendev/Scriptorium',
    'DenisSergeevitch/ex-ussr-kinship-research',
  ],
  ['cursed', 'pallets/flask', 'jqlang/jq'],
];
let failed = false;
for (const args of pairs) {
  const run = spawnSync(
    process.execPath,
    ['scripts/verify-live-browser.mjs', ...args],
    {
      env: {
        ...process.env,
        LIVE_ORIGIN: 'http://127.0.0.1:3002',
        QUALIFY_REVIEW: 'false',
      },
      stdio: 'inherit',
      timeout: 270000,
    },
  );
  if (run.status !== 0) failed = true;
}
if (failed) process.exitCode = 1;
