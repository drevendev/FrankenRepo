import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3003',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1050 },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        defaultBrowserType: 'chromium',
        viewport: { width: 375, height: 812 },
      },
    },
  ],
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:3003/healthz',
    reuseExistingServer: false,
    timeout: 30000,
    env: {
      NODE_ENV: 'test',
      PORT: '3003',
      API_ALLOWED_ORIGINS: 'http://127.0.0.1:3003',
      MODEL_PROVIDER: 'disabled',
      MONGODB_URI: '',
      SENTRY_ENABLED: 'false',
      SESSION_SECRET: 'test-only-session-secret-'.repeat(3),
      BACKBOARD_MEMORY_ENABLED: 'false',
    },
  },
});
