// Operator-only real provider run against an already configured local server.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const startedAt = new Date().toISOString();
const mode = process.argv[2] ?? 'cursed';
if (!['useful', 'cursed', 'chaotic'].includes(mode))
  throw new Error('Choose useful, cursed or chaotic.');
const inputs =
  process.argv.length > 3
    ? process.argv.slice(3, 5)
    : ['pallets/flask', 'jqlang/jq'];
if (inputs.length !== 2)
  throw new Error('Provide exactly two donor references.');
const prefix =
  'docs/eval/runs/' + startedAt.replace(/[:.]/g, '-') + '-' + mode + '-browser';
await mkdir('docs/eval/runs', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const receipt = {
  kind: 'LIVE_BROWSER_RITUAL',
  startedAt,
  endedAt: null,
  latencyMs: null,
  inputs,
  mode,
  recording: false,
  localOrigin: 'http://127.0.0.1:3001',
  readiness: null,
  stages: [],
  state: 'not-started',
  ritualId: null,
  error: null,
  record: null,
  pageErrors: [],
  exports: [],
  limits: { maxOutputTokensPerCall: 1000, maxAttemptsPerRitual: 2 },
};
const begun = performance.now();
page.on('pageerror', (error) => receipt.pageErrors.push(error.message));
page.on('response', async (response) => {
  if (!response.url().includes('/api/v1/rituals')) return;
  try {
    const data = await response.json();
    if (data.ritualId) {
      receipt.ritualId = data.ritualId;
    }
    if (data.state) {
      receipt.state = data.state;
      if (receipt.stages.at(-1)?.state !== data.state) {
        receipt.stages.push({
          state: data.state,
          observedAt: new Date().toISOString(),
        });
        console.log('Ritual stage: ' + data.state);
      }
    }
    if (data.monster) receipt.record = data.monster;
    if (data.error) receipt.error = data.error;
    if (data.code) receipt.error = { code: data.code, message: data.message };
  } catch {
    /* Non-JSON transport responses are handled by the UI. */
  }
});
try {
  receipt.readiness = await (
    await fetch(receipt.localOrigin + '/readyz')
  ).json();
  if (receipt.readiness.model === 'disabled')
    throw new Error('Live model is disabled.');
  await page.goto(receipt.localOrigin + '/');
  await page.locator('#donor-a').fill(receipt.inputs[0]);
  await page.locator('#donor-b').fill(receipt.inputs[1]);
  await page
    .getByRole('radio', { name: mode[0].toUpperCase() + mode.slice(1) })
    .check();
  const inspected = page.waitForResponse((r) =>
    r.url().endsWith('/api/v1/donors/inspect'),
  );
  await page.getByRole('button', { name: 'Inspect donors' }).click();
  const inspection = await inspected;
  if (!inspection.ok()) {
    const error = await inspection.json();
    receipt.error = error;
    throw new Error('Donor inspection failed: ' + error.code);
  }
  await page.getByRole('button', { name: 'Pull the lever' }).click();
  const deadline = Date.now() + 245000;
  while (Date.now() < deadline) {
    if (
      ['completed', 'failed', 'cancelled'].includes(receipt.state) ||
      receipt.error
    )
      break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (receipt.state !== 'completed' || !receipt.record)
    throw new Error(
      'Ritual did not complete: ' + (receipt.error?.code ?? receipt.state),
    );
  await page.locator('#birth-certificate').waitFor();
  for (const [label, suffix] of [
    ['Save PNG', 'png'],
    ['Save SVG', 'svg'],
    ['Alt text', 'txt'],
  ]) {
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: new RegExp(label) }).click();
    const download = await downloading;
    const path = prefix + '.' + suffix;
    await download.saveAs(path);
    const failure = await download.failure();
    if (failure) throw new Error('Export failed: ' + failure);
    receipt.exports.push(path);
  }
  await page
    .locator('#birth-certificate')
    .screenshot({ path: prefix + '-certificate.png' });
  receipt.exports.push(prefix + '-certificate.png');
  console.log('Real creature: ' + receipt.record.draft.name);
} catch (error) {
  receipt.error ??= {
    code: 'VERIFICATION_FAILED',
    message:
      error instanceof Error ? error.message : 'Live verification failed',
  };
  await page
    .screenshot({ path: prefix + '-failure.png', fullPage: true })
    .catch(() => {});
  console.error(receipt.error.code + ': ' + receipt.error.message);
  process.exitCode = 1;
} finally {
  receipt.endedAt = new Date().toISOString();
  receipt.latencyMs = Math.round(performance.now() - begun);
  await writeFile(prefix + '.json', JSON.stringify(receipt, null, 2) + '\n');
  console.log('Saved live receipt: ' + prefix + '.json');
  await browser.close();
}
