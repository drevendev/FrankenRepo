// Explicit bounded operator job. Never imported by the public server.
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir, open, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { normalizeRepo } from '../packages/core/src/index.ts';
const task = process.argv[2];
if (!['research', 'public-e2e'].includes(task))
  throw new Error('Choose research or public-e2e.');
const key = process.env.BROWSERBASE_API_KEY;
if (!key) throw new Error('Browserbase key is absent.');
await mkdir('.local', { recursive: true });
const lock = await open('.local/browserbase-qualification.lock', 'wx').catch(
  () => {
    throw new Error('Another qualification session is active.');
  },
);
const receipt = {
  kind: 'LIVE_BROWSERBASE_' + task.toUpperCase(),
  startedAt: new Date().toISOString(),
  status: 'failed',
  sessionId: null,
  maximumSeconds: 120,
  checks: {},
  error: null,
};
let session, browser;
const api = async (path, body) => {
  const r = await fetch('https://api.browserbase.com/v1/' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      'X-BB-API-Key': key,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error('BROWSERBASE_HTTP_' + r.status);
  return r.json();
};
try {
  let budget = {
    sessions: 1,
    reservedSeconds: 120,
    note: 'Conservatively includes the prior failed smoke.',
  };
  try {
    budget = JSON.parse(
      await readFile('.local/browserbase-budget.json', 'utf8'),
    );
  } catch {
    /* first qualification */
  }
  if (budget.sessions >= 5 || budget.reservedSeconds + 120 > 600)
    throw new Error('BROWSERBASE_BUDGET');
  budget.sessions++;
  budget.reservedSeconds += 120;
  await writeFile(
    '.local/browserbase-budget.json',
    JSON.stringify(budget, null, 2),
  );
  session = await api('sessions', {
    timeout: 120,
    proxies: false,
    browserSettings: { solveCaptchas: false },
  });
  receipt.sessionId = session.id;
  browser = await chromium.connectOverCDP(session.connectUrl, {
    timeout: 20000,
  });
  const page = await browser.contexts()[0].newPage();
  page.setDefaultTimeout(25000);
  if (task === 'research') {
    const recordPath = process.argv[3];
    if (
      !recordPath?.startsWith('docs/eval/runs/') ||
      !recordPath.endsWith('.json') ||
      recordPath.includes('..')
    )
      throw new Error('FIXED_RECEIPT_REQUIRED');
    const record = JSON.parse(await readFile(recordPath, 'utf8')).record;
    const donor = record.parents[0],
      ref = normalizeRepo(donor.ref);
    if (!/^[a-f0-9]{40}$/.test(donor.commitSha))
      throw new Error('PINNED_SNAPSHOT_REQUIRED');
    const sourceUrl =
      'https://github.com/' + ref + '/blob/' + donor.commitSha + '/README.md';
    await page.route('**/*', (route) =>
      new URL(route.request().url()).hostname === 'github.com'
        ? route.continue()
        : route.abort(),
    );
    await page.goto(sourceUrl, { waitUntil: 'domcontentloaded' });
    const text = await page.locator('article').innerText();
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((s) => s.replace(/\s+/g, ' ').trim());
    const excerpt = (
      paragraphs.find(
        (s) =>
          s.length >= 100 &&
          s.length <= 1200 &&
          /repository|repositories|digest|component|license/i.test(s),
      ) ?? paragraphs.find((s) => s.length >= 100)
    )?.slice(0, 1000);
    if (!excerpt) throw new Error('NO_DESCRIPTIVE_PARAGRAPH');
    const context = {
      ref,
      sourceUrl,
      observedAt: new Date().toISOString(),
      excerpt,
      hash: createHash('sha256').update(excerpt).digest('hex'),
      sessionId: session.id,
      snapshot: donor.commitSha,
      method: 'Playwright CDP, rendered GitHub README article paragraph',
      recordPath,
    };
    await writeFile(
      '.local/research-context.json',
      JSON.stringify(context, null, 2),
    );
    receipt.context = context;
    receipt.checks.pinnedGitHubParagraph = true;
    await page.screenshot({
      path: 'docs/eval/BROWSERBASE_RESEARCH.png',
      fullPage: true,
    });
  } else {
    const origin = process.env.PUBLIC_DEMO_ORIGIN;
    if (!origin || !/^https:\/\/[a-z0-9-]+\.onrender\.com$/.test(origin))
      throw new Error('REAL_RENDER_ORIGIN_REQUIRED');
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === origin
        ? route.continue()
        : route.abort(),
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const readiness = await (await page.request.get(origin + '/readyz')).json();
    if (readiness.model === 'disabled' || readiness.storage !== 'ready')
      throw new Error('PUBLIC_READINESS_UNAVAILABLE');
    await page.locator('#donor-a').fill('pallets/flask');
    await page.locator('#donor-b').fill('jqlang/jq');
    await page.getByRole('radio', { name: 'Cursed', exact: true }).check();
    await page
      .getByRole('button', { name: 'Inspect donors', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Pull the lever', exact: true })
      .click();
    await page.locator('#birth-certificate').waitFor({ timeout: 60000 });
    const png = page.waitForEvent('download');
    await page.getByRole('button', { name: /Save PNG/ }).click();
    receipt.checks.pngExport = (await (await png).failure()) === null;
    await page
      .getByRole('button', { name: 'Save card privately', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Open saved card', exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole('button', { name: 'Open saved card', exact: true })
      .click();
    await page.locator('#birth-certificate').waitFor();
    receipt.checks.liveRitualSaveReload = true;
    await page.setViewportSize({ width: 375, height: 812 });
    receipt.checks.mobileNoOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    );
    await page.screenshot({
      path: 'docs/eval/BROWSERBASE_PUBLIC_E2E.png',
      fullPage: true,
    });
  }
  receipt.status = 'passed';
} catch (error) {
  receipt.error =
    error instanceof Error && /^[A-Z_]+(?:\d+)?$/.test(error.message)
      ? error.message
      : 'SANITIZED_BROWSER_FAILURE';
  process.exitCode = 1;
} finally {
  if (session) {
    try {
      await api('sessions/' + session.id, {
        status: 'REQUEST_RELEASE',
        ...(session.projectId ? { projectId: session.projectId } : {}),
      });
      receipt.releaseRequested = true;
    } catch {
      receipt.releaseRequested = false;
    }
  }
  await browser?.close().catch(() => {});
  await lock.close();
  await unlink('.local/browserbase-qualification.lock');
  receipt.endedAt = new Date().toISOString();
  receipt.elapsedSeconds =
    (Date.parse(receipt.endedAt) - Date.parse(receipt.startedAt)) / 1000;
  await writeFile(
    'docs/eval/BROWSERBASE_' +
      (task === 'research' ? 'RESEARCH' : 'PUBLIC_E2E') +
      '.json',
    JSON.stringify(receipt, null, 2) + '\n',
  );
  console.log(JSON.stringify(receipt));
}
