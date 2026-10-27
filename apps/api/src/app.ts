import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import type { HttpBindings } from '@hono/node-server';
import { ZodError } from 'zod';
import { LabError, inspectSchema, ritualSchema } from '@frankenrepo/core';
import {
  GitHubAdapter,
  InferenceAdapter,
  type InferencePort,
} from '@frankenrepo/adapters';
import { RitualRunner, type DonorPort } from '@frankenrepo/ritual';
import { readConfig, type Config } from './config';

class Buckets {
  private values = new Map<string, { count: number; expires: number }>();
  take(key: string, max: number, windowMs: number) {
    const now = Date.now();
    for (const [k, b] of this.values)
      if (b.expires <= now) this.values.delete(k);
    let b = this.values.get(key);
    if (!b) {
      if (this.values.size >= 5000)
        throw new LabError(
          'RATE_CAPACITY',
          'The lab has reached its temporary visitor capacity.',
          429,
          true,
        );
      b = { count: 0, expires: now + windowMs };
      this.values.set(key, b);
    }
    if (b.count >= max)
      throw new LabError(
        'RATE_LIMITED',
        'The lab has reached its request limit. Please return after this short window.',
        429,
        true,
      );
    b.count++;
  }
}
type Env = {
  Bindings: HttpBindings;
  Variables: { requestId: string; scope: string };
};
export function createApp(
  options: { config?: Config; github?: DonorPort; model?: InferencePort } = {},
) {
  const config = options.config ?? readConfig();
  const github =
    options.github ??
    new GitHubAdapter({
      token: config.GITHUB_READ_TOKEN,
      ttlMs: config.GITHUB_CACHE_TTL_SEC * 1000,
    });
  const model = options.model ?? new InferenceAdapter(config.model);
  const runner = new RitualRunner(github, model, {
    maxParallel: config.MAX_PARALLEL_RITUALS,
  });
  const buckets = new Buckets();
  const salt = randomBytes(32);
  const app = new Hono<Env>();
  app.use('*', async (c, next) => {
    const requestId = randomUUID();
    c.set('requestId', requestId);
    c.header('X-Request-ID', requestId);
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'no-referrer');
    c.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    );
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // Never trust client-supplied forwarding headers. Default localhost hosting has one bucket.
    const address = c.env?.incoming?.socket?.remoteAddress ?? 'local-test';
    const scope = createHmac('sha256', salt).update(address).digest('hex');
    c.set('scope', scope);
    const origin = c.req.header('Origin');
    if (origin) {
      if (!config.origins.includes(origin))
        throw new LabError(
          'ORIGIN_DENIED',
          'This origin is not allowed to access the lab.',
          403,
        );
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Vary', 'Origin');
      c.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      c.header('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (c.req.method === 'OPTIONS') return c.body(null, 204);
    if (c.req.path.startsWith('/api/')) {
      c.header('Cache-Control', 'no-store');
      buckets.take('all:' + scope, 120, 60_000);
      if (c.req.method === 'POST') {
        if (
          !/^application\/json(?:\s*;.*)?$/i.test(
            c.req.header('Content-Type') ?? '',
          )
        )
          throw new LabError('JSON_REQUIRED', 'Send application/json.', 415);
        const length = Number(c.req.header('Content-Length'));
        if (length > 20_000)
          throw new LabError(
            'BODY_TOO_LARGE',
            'Request exceeds the lab input limit.',
            413,
          );
        // Read a bounded stream, even when Content-Length is absent or misleading.
        const reader = c.req.raw.body?.getReader();
        let size = 0;
        const chunks: Uint8Array[] = [];
        if (reader)
          try {
            while (true) {
              const item = await reader.read();
              if (item.done) break;
              size += item.value.byteLength;
              if (size > 20_000) {
                await reader.cancel();
                throw new LabError(
                  'BODY_TOO_LARGE',
                  'Request exceeds the lab input limit.',
                  413,
                );
              }
              chunks.push(item.value);
            }
          } finally {
            reader.releaseLock();
          }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.length;
        }
        let body: unknown;
        try {
          body = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
        } catch {
          throw new LabError(
            'INVALID_JSON',
            'The request is not valid JSON.',
            400,
          );
        }
        // Hono's parsed-body cache is the only consumer downstream.
        c.req.bodyCache.json = Promise.resolve(body);
      }
    }
    await next();
  });
  app.onError((err, c) => {
    const safe =
      err instanceof LabError
        ? err
        : err instanceof ZodError
          ? new LabError(
              'INVALID_INPUT',
              err.issues
                .map((i) => i.message)
                .join(' ')
                .slice(0, 300),
              400,
            )
          : new LabError(
              'INTERNAL_ERROR',
              'The lab could not complete this request.',
              500,
              true,
            );
    if (safe.status === 429)
      c.header('Retry-After', String(config.RATE_LIMIT_WINDOW_SEC));
    return c.json(
      {
        code: safe.code,
        message: safe.message,
        retryable: safe.retryable,
        requestId: c.get('requestId') ?? randomUUID(),
      },
      safe.status as 400,
    );
  });
  app.notFound((c) =>
    c.json(
      {
        code: 'NOT_FOUND',
        message: 'This lab route does not exist.',
        retryable: false,
        requestId: c.get('requestId'),
      },
      404,
    ),
  );
  app.get('/healthz', (c) => c.json({ status: 'ok' }));
  app.get('/readyz', (c) =>
    c.json({
      model: model.capability(),
      storage: 'disabled',
      version: '0.1.0',
      recordedSamples: 0,
      features: { gallery: false, permalinks: false, voice: false },
    }),
  );
  app.post('/api/v1/donors/inspect', async (c) => {
    buckets.take(
      'inspect:' + c.get('scope'),
      12,
      config.RATE_LIMIT_WINDOW_SEC * 1000,
    );
    const { donors } = inspectSchema.parse(await c.req.json());
    const genomes = await Promise.all([
      github.inspect(donors[0], 'A'),
      github.inspect(donors[1], 'B'),
    ]);
    return c.json({ donors: genomes });
  });
  app.post('/api/v1/rituals', async (c) => {
    const { donors, mode, clientRequestId } = ritualSchema.parse(
      await c.req.json(),
    );
    const scope = c.get('scope');
    const existing = runner.lookup(
      scope,
      clientRequestId,
      JSON.stringify({ donors: donors.map((d) => d.toLowerCase()), mode }),
    );
    if (existing)
      return c.json(
        { ritualId: existing.ritualId, state: existing.state },
        202,
      );
    if (model.capability() === 'disabled')
      throw new LabError(
        'MODEL_DISABLED',
        'Live Gemma is not configured. Inspect your donors first; no recorded model result is bundled.',
        503,
      );
    buckets.take(
      'ritual:' + scope,
      config.RATE_LIMIT_MAX,
      config.RATE_LIMIT_WINDOW_SEC * 1000,
    );
    const job = runner.start(scope, clientRequestId, donors, mode);
    return c.json({ ritualId: job.ritualId, state: 'queued' }, 202);
  });
  app.get('/api/v1/rituals/:id', (c) => {
    const id = c.req.param('id');
    if (!/^[0-9a-f-]{36}$/.test(id))
      throw new LabError('JOB_NOT_FOUND', 'Unknown ritual.', 404);
    return c.json(runner.get(id, c.get('scope')));
  });
  app.post('/api/v1/rituals/:id/cancel', (c) =>
    c.json(runner.cancel(c.req.param('id'), c.get('scope'))),
  );
  return app;
}
