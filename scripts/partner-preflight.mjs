import { mkdir, writeFile } from 'node:fs/promises';
const result = {
  kind: 'LIVE_READ_ONLY_PREFLIGHT',
  at: new Date().toISOString(),
  services: {},
};
const checks = [
  ['paperPricing', 'https://api.paperinstruments.com/v1/pricing', {}],
  [
    'paperBalance',
    'https://api.paperinstruments.com/v1/usage',
    { Authorization: 'Bearer ' + process.env.PAPER_INSTRUMENTS_API_KEY },
  ],
  [
    'paperModels',
    'https://api.paperinstruments.com/v1/models',
    { Authorization: 'Bearer ' + process.env.PAPER_INSTRUMENTS_API_KEY },
  ],
  [
    'backboardBalance',
    'https://app.backboard.io/api/billing/balance',
    { 'X-API-Key': process.env.BACKBOARD_API_KEY },
  ],
  [
    'tinkerCapabilities',
    'https://tinker.thinkingmachines.dev/services/tinker-prod/api/v1/get_server_capabilities',
    { 'X-API-Key': process.env.TINKER_API_KEY },
  ],
];
for (const [name, url, headers] of checks) {
  try {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    const data = await r.json();
    result.services[name] = { status: r.status, data };
  } catch {
    result.services[name] = { error: 'transport_error' };
  }
}
// Raw provider JSON may contain account identifiers; retain it only locally.
await mkdir('.local', { recursive: true });
await writeFile(
  '.local/partner-preflight.json',
  JSON.stringify(result, null, 2),
);
for (const [name, value] of Object.entries(result.services))
  console.log(
    name,
    JSON.stringify({
      status: value.status,
      error: value.error,
      keys: value.data ? Object.keys(value.data) : [],
    }),
  );
console.log(
  'Private preflight saved; no model, training or memory operations called.',
);
