// Opt-in cloud UI QA of the built lab, not a hosted demo or a model run.
import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const key = process.env.BROWSERBASE_API_KEY;
if (!key)
  throw new Error('Set BROWSERBASE_API_KEY in the excluded .env first.');
const api = async (path, body) => {
  const response = await fetch('https://api.browserbase.com/v1/' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      'X-BB-API-Key': key,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error('BROWSERBASE_HTTP_' + response.status);
  return response.json();
};
const receipt = {
  kind: 'LIVE_BROWSERBASE_UI_QA',
  startedAt: new Date().toISOString(),
  modelCalled: false,
  hostedPublicDemo: false,
  backend: 'disabled test response; static assets from the production build',
  sessionUrl: null,
  checks: {},
  status: 'failed',
};
let browser, session;
await mkdir('.local', { recursive: true });
try {
  const projects = await api('projects');
  if (!Array.isArray(projects) || !projects.length)
    throw new Error('NO_ACCESSIBLE_PROJECT');
  receipt.checks.apiKeyAccepted = true;
  session = await api('sessions', {
    timeout: 120,
    proxies: false,
    browserSettings: { solveCaptchas: false },
  });
  receipt.sessionUrl = 'https://www.browserbase.com/sessions/' + session.id;
  console.log('Cloud browser: ' + receipt.sessionUrl);
  browser = await chromium.connectOverCDP(session.connectUrl, {
    timeout: 30000,
  });
  const page = await browser.contexts()[0].newPage();
  const root = resolve('apps/web/dist');
  await page.route('https://frankenrepo.test/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/readyz')
      return route.fulfill({
        json: { model: 'disabled', storage: 'disabled' },
      });
    const file = resolve(
      root,
      '.' + (path === '/' ? '/index.html' : decodeURIComponent(path)),
    );
    if (!file.startsWith(root + sep))
      return route.fulfill({ status: 404, body: 'Not found' });
    const type = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.woff2': 'font/woff2',
    }[extname(file)];
    if (!type) return route.fulfill({ status: 404, body: 'Not found' });
    try {
      await route.fulfill({ body: await readFile(file), contentType: type });
    } catch {
      await route.fulfill({ status: 404, body: 'Not found' });
    }
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('https://frankenrepo.test/', {
    waitUntil: 'domcontentloaded',
  });
  await page
    .getByRole('heading', { name: 'Good repos. Bad chemistry.' })
    .waitFor();
  receipt.checks.productionUiLoaded = true;
  await page.getByText('Open the specimen cabinet', { exact: false }).click();
  await page
    .getByLabel('Donor A specimen')
    .selectOption('drevendev/HungryCrab');
  await page
    .getByLabel('Donor B specimen')
    .selectOption('DenisSergeevitch/desktop-fly');
  await page.getByRole('radio', { name: 'Chaotic', exact: false }).check();
  if ((await page.locator('#donor-a').inputValue()) !== 'drevendev/HungryCrab')
    throw new Error('SAMPLE_SELECTION_FAILED');
  receipt.checks.sampleSelectionAndMode = true;
  await page.setViewportSize({ width: 375, height: 812 });
  if (
    !(await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ))
  )
    throw new Error('MOBILE_OVERFLOW');
  receipt.checks.mobileLayout = true;
  await page.screenshot({
    path: '.local/browserbase-smoke.png',
    fullPage: true,
  });
  receipt.status = 'passed';
} catch (error) {
  // CDP errors can embed secret URLs. Only emit known status codes or the type.
  receipt.error = /^BROWSERBASE_HTTP_\d+$|^NO_ACCESSIBLE_PROJECT$/.test(
    error.message,
  )
    ? error.message
    : error.name;
  process.exitCode = 1;
} finally {
  if (session)
    try {
      await api('sessions/' + session.id, { status: 'REQUEST_RELEASE' });
      receipt.releaseRequested = true;
    } catch {
      receipt.releaseRequested = false;
    }
  await browser?.close().catch(() => {});
  receipt.endedAt = new Date().toISOString();
  await writeFile(
    'docs/eval/BROWSERBASE_SMOKE.json',
    JSON.stringify(receipt, null, 2) + '\n',
  );
  console.log(JSON.stringify(receipt));
}
