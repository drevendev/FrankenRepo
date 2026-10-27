import { test, expect } from '@playwright/test';
import { TEST_DONORS, testMonster } from '../fixtures';
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
