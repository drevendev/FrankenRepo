import { test, expect } from '@playwright/test';
import { TEST_DONORS, testMonster } from '../fixtures';

test('sound is opt-in, uses one real audio context, and pauses when hidden or muted', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    const probe = { contexts: [] as AudioContext[], starts: 0 };
    Object.assign(window, { __labAudio: probe });
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) {
        super(options);
        probe.contexts.push(this);
      }
      createOscillator() {
        const oscillator = super.createOscillator();
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (when?: number) => {
          probe.starts++;
          start(when);
        };
        return oscillator;
      }
    };
  });
  const audioState = () =>
    page.evaluate(() => {
      const probe = (
        window as typeof window & {
          __labAudio: { contexts: AudioContext[]; starts: number };
        }
      ).__labAudio;
      return {
        count: probe.contexts.length,
        state: probe.contexts[0]?.state,
        starts: probe.starts,
      };
    });
  await page.goto('/');
  await page.getByRole('button', { name: 'Audio settings' }).click();
  await expect(
    page.getByRole('group', { name: 'Laboratory audio' }),
  ).toBeVisible();
  expect((await audioState()).count).toBe(0);
  await page.getByRole('button', { name: 'Sound off' }).click();
  await expect.poll(async () => (await audioState()).state).toBe('running');
  await expect
    .poll(async () => (await audioState()).starts)
    .toBeGreaterThanOrEqual(7);
  await page.getByRole('slider', { name: 'Lab volume' }).focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('slider', { name: 'Lab volume' })).toHaveValue(
    '1',
  );
  await page.getByRole('button', { name: 'Music on' }).click();
  await expect(page.getByRole('button', { name: 'Music off' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.screenshot({
    path: '.local/audio-settings-' + info.project.name + '.png',
  });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await audioState()).state).toBe('suspended');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await audioState()).state).toBe('running');
  await page.getByRole('button', { name: 'Sound on' }).click();
  await expect.poll(async () => (await audioState()).state).toBe('suspended');
  await page.getByRole('button', { name: 'Sound off' }).click();
  await expect.poll(async () => (await audioState()).state).toBe('running');
  expect((await audioState()).count).toBe(1);
  await page.getByRole('button', { name: 'Sound on' }).click();
  await page.getByRole('slider', { name: 'Lab volume' }).focus();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('group', { name: 'Laboratory audio' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Audio settings' }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});

test('decorative laboratory motion can be paused and respects the system preference', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const animation = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
  expect(await animation('.brew-bubble')).toBe('bubble-rise');
  expect(await animation('.lab-phantom')).toBe('resident-ghost');
  await page.getByRole('button', { name: 'Motion on' }).click();
  for (const selector of [
    '.brew-bubble',
    '.coil-light',
    '.gauge-needle',
    '.wandering-spores i',
    '.specimen',
    '.lab-phantom',
  ]) {
    expect(await animation(selector)).toBe('none');
  }
  await page.getByRole('button', { name: 'Motion off' }).click();
  expect(await animation('.brew-bubble')).toBe('bubble-rise');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: 'Motion off' })).toBeDisabled();
  expect(await animation('.brew-bubble')).toBe('none');
  expect(
    await page
      .locator('.lab-atmosphere')
      .evaluate((el) => getComputedStyle(el).display),
  ).toBe('none');
});
test('default lab is honest, keyboard usable, and fits small screens', async ({
  page,
}, info) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Good repos. Bad chemistry.' }),
  ).toBeVisible();
  await expect(
    page.getByText('Live Gemma unavailable', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Pull the lever' }),
  ).toBeDisabled();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to the laboratory' }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Use sample donors' }).click();
  await expect(page.getByLabel('The brain', { exact: false })).toHaveValue(
    'withastro/astro',
  );
  await page.getByRole('button', { name: 'Swap donors' }).click();
  await expect(page.locator('#donor-a')).toHaveValue('excalidraw/excalidraw');
  await expect(page.getByRole('button', { name: 'Sound off' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.locator('input[value="useful"]').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('input[value="useful"]')).toBeChecked();
  const viewport = page.viewportSize()!;
  await page.setViewportSize({ width: 320, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize(viewport);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'docs/images/lab-' + info.project.name + '.png',
    fullPage: true,
  });
});
test('mocked success renders evidence and downloads PNG, SVG and alt text', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/readyz', (r) =>
    r.fulfill({ json: { model: 'unknown', storage: 'disabled' } }),
  );
  await page.route('**/api/v1/donors/inspect', (r) =>
    r.fulfill({ json: { donors: TEST_DONORS } }),
  );
  await page.route('**/api/v1/rituals', (r) =>
    r.fulfill({ status: 202, json: { ritualId: 'fixture', state: 'queued' } }),
  );
  await page.route('**/api/v1/rituals/fixture', (r) =>
    r.fulfill({
      json: {
        ritualId: 'fixture',
        state: 'completed',
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        monster: testMonster(),
      },
    }),
  );
  await page.goto('/');
  await page.locator('#donor-a').fill('test/brain');
  await page.locator('#donor-b').fill('test/body');
  await page.getByRole('button', { name: 'Inspect donors' }).click();
  await expect(
    page.getByText('TEST FIXTURE: A source-linked thought map.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pull the lever' }).click();
  await expect(
    page.getByRole('heading', { name: 'The Merge Wraith' }),
  ).toBeVisible();
  await expect(
    page.getByText('TEST FIXTURE — not a model run', { exact: false }).first(),
  ).toBeVisible();
  await page.getByText('View DNA', { exact: false }).click();
  await expect(
    page.getByText('Facts, sources & a little scientific humility'),
  ).toBeVisible();
  for (const name of ['Save PNG', 'Save SVG', 'Alt text']) {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: new RegExp(name) }).click();
    const file = await download;
    expect(await file.failure()).toBeNull();
    const suffix =
      name === 'Save PNG' ? 'png' : name === 'Save SVG' ? 'svg' : 'txt';
    await file.saveAs(
      '.local/export-fixture-' + info.project.name + '.' + suffix,
    );
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const duration = await page
    .locator('.specimen')
    .evaluate((el) => getComputedStyle(el).animationDuration);
  expect(duration).toBe('0s');
  await page.getByRole('button', { name: 'Remix these parents' }).click();
  await expect(page.locator('#donor-a')).toHaveValue('test/brain');
});
test('failed provider preserves donor inputs, with no fabricated certificate', async ({
  page,
}) => {
  await page.route('**/readyz', (r) =>
    r.fulfill({ json: { model: 'unknown', storage: 'disabled' } }),
  );
  await page.route('**/api/v1/donors/inspect', (r) =>
    r.fulfill({ json: { donors: TEST_DONORS } }),
  );
  await page.route('**/api/v1/rituals', (r) =>
    r.fulfill({
      status: 429,
      json: {
        code: 'MODEL_QUOTA',
        message: 'The model quota is exhausted.',
        retryable: true,
        requestId: 'fixture',
      },
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Use sample donors' }).click();
  await page.getByRole('button', { name: 'Inspect donors' }).click();
  await page.getByRole('button', { name: 'Pull the lever' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'The model quota is exhausted.',
  );
  await expect(page.locator('#donor-a')).toHaveValue('withastro/astro');
  await expect(page.locator('#birth-certificate')).toHaveCount(0);
});
test('offline API, forbidden donor errors, and untrusted HTML remain visible text', async ({
  page,
}) => {
  await page.route('**/readyz', (r) => r.abort());
  await page.goto('/');
  await expect(
    page.getByText('The lab is offline. Your inputs stay here.'),
  ).toBeVisible();
  await page.route('**/api/v1/donors/inspect', (r) =>
    r.fulfill({
      status: 404,
      json: { message: 'Repository not found or private.' },
    }),
  );
  await page.locator('#donor-a').fill('test/private');
  await page.locator('#donor-b').fill('test/body');
  await page.getByRole('button', { name: 'Inspect donors' }).click();
  await expect(page.getByRole('alert')).toContainText('not found or private');
  await page.route('**/api/v1/donors/inspect', (r) =>
    r.fulfill({
      json: {
        donors: [
          { ...TEST_DONORS[0], description: '<img src=x onerror=alert(1)>' },
          TEST_DONORS[1],
        ],
      },
    }),
  );
  await page.getByRole('button', { name: 'Inspect donors' }).click();
  await expect(
    page.getByText('<img src=x onerror=alert(1)>', { exact: true }),
  ).toBeVisible();
  expect(await page.locator('.observed-donor img').count()).toBe(0);
});
