import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApp } from './app';
import { readConfig } from './config';
const config = readConfig();
const app = createApp({ config });
app.use('/*', serveStatic({ root: './apps/web/dist' }));
const server = serve(
  { fetch: app.fetch, port: config.PORT, hostname: config.HOST },
  (info) =>
    console.log(
      'FrankenRepo lab listening on http://' +
        config.HOST +
        ':' +
        info.port +
        ' · model ' +
        config.MODEL_PROVIDER,
    ),
);
for (const event of ['SIGINT', 'SIGTERM'] as const)
  process.on(event, () => {
    server.close();
    setTimeout(() => process.exit(0), 500).unref();
  });
