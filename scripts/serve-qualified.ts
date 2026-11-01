// Explicit operator entry point; ordinary npm start keeps MODEL_PROVIDER disabled
// unless the operator has deliberately configured it.
import '../apps/api/src/instrument';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApp } from '../apps/api/src/app';
import { readConfig } from '../apps/api/src/config';
const config = readConfig({
  ...process.env,
  API_ALLOWED_ORIGINS: 'http://127.0.0.1:3002',
  MODEL_PROVIDER: 'cloudflare',
  MODEL_CALLS_PER_DAY: '20',
  ORCHESTRATOR: 'mastra',
  PUBLIC_SHARING_ENABLED: 'true',
  ULTRAMARINE_REVIEW_ENABLED: 'true',
});
const app = createApp({ config });
app.use('/*', serveStatic({ root: './apps/web/dist' }));
const server = serve(
  { fetch: app.fetch, hostname: '127.0.0.1', port: 3002 },
  () =>
    console.log(
      'Explicit operator lab on http://127.0.0.1:3002; Mongo budgets active; fixtures absent.',
    ),
);
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
