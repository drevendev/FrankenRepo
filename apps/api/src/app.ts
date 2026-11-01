import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { Hono } from 'hono';
import { readFile } from 'node:fs/promises';
import type { HttpBindings } from '@hono/node-server';
import { z, ZodError } from 'zod';
import { LabError, inspectSchema, ritualSchema } from '@frankenrepo/core';
import {
  GitHubAdapter,
  InferenceAdapter,
  MongoCardStore,
  type CardStore,
  type InferencePort,
  labTelemetry,
  UltramarineReviewer,
  BackboardMemory,
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
  options: {
    config?: Config;
    github?: DonorPort;
    model?: InferencePort;
    store?: CardStore;
  } = {},
) {
  const config = options.config ?? readConfig();
  const github =
    options.github ??
    new GitHubAdapter({
      token: config.GITHUB_READ_TOKEN,
      ttlMs: config.GITHUB_CACHE_TTL_SEC * 1000,
    });
  const model = options.model ?? new InferenceAdapter(config.model);
  const store =
    options.store ??
    (config.MONGODB_URI
      ? new MongoCardStore(config.MONGODB_URI, config.MONGODB_DB)
      : undefined);
  const memory =
    config.BACKBOARD_MEMORY_ENABLED === 'true' &&
    config.BACKBOARD_API_KEY &&
    config.BACKBOARD_ASSISTANT_ID &&
    config.BACKBOARD_MAX_READ_USD &&
    store instanceof MongoCardStore
      ? new BackboardMemory(
          config.BACKBOARD_API_KEY,
          config.BACKBOARD_ASSISTANT_ID,
          store,
          config.BACKBOARD_MAX_READ_USD,
        )
      : undefined;
  const runner = new RitualRunner(github, model, {
    maxParallel: config.MAX_PARALLEL_RITUALS,
    store,
    controls: store instanceof MongoCardStore ? store.controls : undefined,
    dailyCalls: config.MODEL_CALLS_PER_DAY,
    maxUsdPerCall: config.MODEL_PROVIDER === 'cloudflare' ? 0.005 : 0,
    orchestrator: config.ORCHESTRATOR,
    telemetry: labTelemetry,
    memory: memory ? (genomes) => memory.search(genomes) : undefined,
    research:
      config.BROWSER_RESEARCH_ENABLED === 'true'
        ? async (genomes) => {
            const raw = await readFile('.local/research-context.json', 'utf8');
            if (raw.length > 5000) return [];
            const context = z
              .object({
                ref: z.string(),
                sourceUrl: z.string().url(),
                observedAt: z.iso.datetime(),
                excerpt: z.string().max(1000),
                hash: z.string().regex(/^[a-f0-9]{64}$/),
                sessionId: z.uuid(),
                snapshot: z.string().regex(/^[a-f0-9]{40}$/),
              })
              .parse(JSON.parse(raw));
            const donor = genomes.find(
              (g) => g.ref === context.ref && g.commitSha === context.snapshot,
            );
            if (
              !donor ||
              context.sourceUrl !==
                donor.url + '/blob/' + donor.commitSha + '/README.md'
            )
              return [];
            return [context];
          }
        : undefined,
  });
  const buckets = new Buckets();
  const salt = config.SESSION_SECRET ?? randomBytes(32).toString('base64url');
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
    let identity = address;
    if (config.SESSION_SECRET) {
      const cookie =
        /(?:^|;\s*)frankenrepo_session=([A-Za-z0-9_-]{43})\.([A-Za-z0-9_-]{43})(?:;|$)/.exec(
          c.req.header('Cookie') ?? '',
        );
      const sign = (id: string) =>
        createHmac('sha256', salt).update(id).digest('base64url');
      if (
        cookie &&
        timingSafeEqual(Buffer.from(cookie[2]), Buffer.from(sign(cookie[1])))
      )
        identity = cookie[1];
      else {
        identity = randomBytes(32).toString('base64url');
        c.header(
          'Set-Cookie',
          `frankenrepo_session=${identity}.${sign(identity)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${config.NODE_ENV === 'production' ? '; Secure' : ''}`,
        );
      }
    }
    const scope = createHmac('sha256', salt).update(identity).digest('hex');
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
      c.header('Access-Control-Allow-Credentials', 'true');
      c.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
      c.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    }
    if (c.req.method === 'OPTIONS') return c.body(null, 204);
    if (c.req.path.startsWith('/api/') || c.req.path === '/readyz')
      buckets.take(
        'socket:' + createHmac('sha256', salt).update(address).digest('hex'),
        120,
        60_000,
      );
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
  app.get('/readyz', async (c) => {
    let storage = 'disabled';
    if (store) {
      try {
        await store.ping();
        storage = 'ready';
      } catch {
        storage = 'unavailable';
      }
    }
    return c.json({
      model: model.capability(),
      storage,
      version: '0.2.0-local',
      configuration:
        model.capability() === 'disabled' ? 'disabled' : 'configured',
      recentInference:
        store instanceof MongoCardStore && storage === 'ready'
          ? await store.controls.recentInference()
          : null,
      localQuota:
        store instanceof MongoCardStore && storage === 'ready'
          ? await store.controls.quota('gemma', config.MODEL_CALLS_PER_DAY)
          : null,
      visitorLimit:
        'Signed browser session; global budgets apply independently. Forwarding headers are not trusted.',
      recordedSamples: 0,
      features: {
        gallery: false,
        permalinks:
          config.PUBLIC_SHARING_ENABLED === 'true' && storage === 'ready',
        reviews:
          config.ULTRAMARINE_REVIEW_ENABLED === 'true' &&
          !!config.PAPER_INSTRUMENTS_API_KEY &&
          storage === 'ready',
        voice: false,
        apprentice: false,
      },
    });
  });
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
    const job = await runner.startDurable(scope, clientRequestId, donors, mode);
    return c.json({ ritualId: job.ritualId, state: 'queued' }, 202);
  });
  app.get('/api/v1/rituals/:id', async (c) => {
    const id = c.req.param('id');
    if (!/^[0-9a-f-]{36}$/.test(id))
      throw new LabError('JOB_NOT_FOUND', 'Unknown ritual.', 404);
    const job = await runner.getPersisted(id, c.get('scope'));
    if (!job)
      throw new LabError(
        'JOB_NOT_FOUND',
        'This ritual is unavailable or has expired.',
        404,
      );
    return c.json(job);
  });
  app.post('/api/v1/rituals/:id/save', async (c) => {
    buckets.take(
      'save:' + c.get('scope'),
      6,
      config.RATE_LIMIT_WINDOW_SEC * 1000,
    );
    c.header('Cache-Control', 'no-store');
    if (store instanceof MongoCardStore && config.SESSION_SECRET) {
      const job = await runner.getPersisted(c.req.param('id'), c.get('scope'));
      if (!job?.monster || job.state !== 'completed')
        throw new LabError(
          'CARD_NOT_READY',
          'Complete the ritual before saving.',
          409,
        );
      const id = job.monster.id;
      const token = createHmac('sha256', config.SESSION_SECRET)
        .update(c.get('scope') + ':' + id)
        .digest('base64url');
      return c.json(await store.save(job.monster, { id, token }));
    }
    return c.json(await runner.save(c.req.param('id'), c.get('scope')));
  });
  const accessToken = (header?: string) => {
    const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(header ?? '')?.[1];
    if (!token)
      throw new LabError(
        'CARD_NOT_FOUND',
        'This saved card is unavailable.',
        404,
      );
    return token;
  };
  const owned = async (id: string, header?: string) => {
    if (!store)
      throw new LabError(
        'STORAGE_DISABLED',
        'The archive is unavailable.',
        503,
      );
    const token = accessToken(header);
    const card = await store.read(id, token);
    if (!card)
      throw new LabError(
        'CARD_NOT_FOUND',
        'This saved card is unavailable.',
        404,
      );
    return { card, token };
  };
  app.on(['POST', 'DELETE'], '/api/v1/cards/:id/publication', async (c) => {
    if (
      config.PUBLIC_SHARING_ENABLED !== 'true' ||
      !(store instanceof MongoCardStore)
    )
      throw new LabError(
        'SHARING_DISABLED',
        'Public sharing is unavailable.',
        503,
      );
    const { token } = await owned(
      c.req.param('id'),
      c.req.header('Authorization'),
    );
    if (c.req.method === 'DELETE') {
      await store.unpublish(c.req.param('id'), token);
      return c.json({
        unpublished: true,
        memoryDeletion: 'revoked immediately; external deletion may be pending',
      });
    }
    z.strictObject({ confirmed: z.literal(true) }).parse(await c.req.json());
    const publication = await store.publish(c.req.param('id'), token);
    return c.json({
      ...publication,
      path: '/?exhibit=' + publication.publicId,
    });
  });
  app.get('/api/v1/exhibits/:id', async (c) => {
    if (
      config.PUBLIC_SHARING_ENABLED !== 'true' ||
      !(store instanceof MongoCardStore)
    )
      throw new LabError(
        'EXHIBIT_NOT_FOUND',
        'This specimen is unavailable.',
        404,
      );
    const card = await store.exhibit(c.req.param('id'));
    if (!card)
      throw new LabError(
        'EXHIBIT_NOT_FOUND',
        'This specimen is unavailable.',
        404,
      );
    return c.json({ monster: card });
  });
  app.post('/api/v1/cards/:id/reviews', async (c) => {
    const { card } = await owned(
      c.req.param('id'),
      c.req.header('Authorization'),
    );
    z.strictObject({
      confirmed: z.literal(true),
      clientRequestId: z.uuid(),
    }).parse(await c.req.json());
    if (
      config.ULTRAMARINE_REVIEW_ENABLED !== 'true' ||
      !config.PAPER_INSTRUMENTS_API_KEY ||
      !(store instanceof MongoCardStore)
    )
      throw new LabError(
        'REVIEW_DISABLED',
        'The second opinion is unavailable.',
        503,
      );
    // One immutable review operation per revision, including network unknowns.
    const { operation, fresh } = await store.controls.reserve({
      scope: 'card:' + c.req.param('id'),
      key: 'review:' + card.id,
      fingerprint: card.contentHash,
      kind: 'ultramarine',
      calls: 1,
      maxUsd: 0.1,
      dailyCalls: 5,
      maxParallel: 1,
    });
    if (fresh) {
      const reviewer = new UltramarineReviewer(
        config.PAPER_INSTRUMENTS_API_KEY,
        (info) =>
          store.controls.settleAttempt(operation.id, operation.id, {
            model: info.model,
            inputTokens: info.inputTokens,
            outputTokens: info.outputTokens,
            costUsd: info.costUsd,
            outcome:
              info.finishReason === 'stop'
                ? 'received-not-yet-validated'
                : 'output-limited',
          }),
      );
      void store.runReview(operation.id, c.req.param('id'), () =>
        reviewer.review(card),
      );
    }
    return c.json(
      { jobId: operation.id, state: fresh ? 'queued' : operation.state },
      202,
    );
  });
  app.get('/api/v1/cards/:id/reviews/:job', async (c) => {
    await owned(c.req.param('id'), c.req.header('Authorization'));
    if (!(store instanceof MongoCardStore))
      throw new LabError(
        'REVIEW_DISABLED',
        'The second opinion is unavailable.',
        503,
      );
    const review = await store.getReview(c.req.param('id'), c.req.param('job'));
    if (!review) return c.json({ state: 'queued' });
    return c.json(review);
  });
  app.post('/api/v1/cards/:id/revisions', async (c) => {
    const { card } = await owned(
      c.req.param('id'),
      c.req.header('Authorization'),
    );
    const input = z
      .strictObject({
        reviewJobId: z.uuid(),
        clientRequestId: z.uuid(),
        confirmed: z.literal(true),
      })
      .parse(await c.req.json());
    if (!(store instanceof MongoCardStore) || card.revision)
      throw new LabError(
        'REVISION_LIMIT',
        'Only one deliberate revision is available for an original specimen.',
        409,
      );
    const review = await store.getReview(c.req.param('id'), input.reviewJobId);
    if (!review?.review)
      throw new LabError(
        'REVIEW_REQUIRED',
        'Choose a completed second opinion first.',
        409,
      );
    if (!card.workflow?.runId)
      throw new LabError(
        'REVISION_LIMIT',
        'This historical specimen has no current durable attempt allowance.',
        409,
      );
    const job = await runner.startDurable(
      c.get('scope'),
      'revision:' + card.id,
      [card.parents[0].ref, card.parents[1].ref],
      card.mode,
      {
        revision: {
          original: card.draft,
          advice: JSON.stringify(review.review.interpretation),
          originalCardId: c.req.param('id'),
          originalContentHash: card.contentHash,
          reviewId: review.review.id,
          originalOperationId: card.workflow.runId,
          parents: card.parents,
        },
      },
    );
    return c.json({ ritualId: job.ritualId, state: job.state }, 202);
  });
  app.on(['GET', 'DELETE'], '/api/v1/cards/:id', async (c) => {
    c.header('Cache-Control', 'no-store');
    buckets.take(
      'archive:' + c.get('scope'),
      120,
      config.RATE_LIMIT_WINDOW_SEC * 1000,
    );
    if (!store)
      throw new LabError(
        'STORAGE_DISABLED',
        'Permanent storage is not configured.',
        503,
      );
    const id = c.req.param('id');
    if (!/^[0-9a-f-]{36}$/.test(id))
      throw new LabError(
        'CARD_NOT_FOUND',
        'This saved card is unavailable.',
        404,
      );
    const token = accessToken(c.req.header('Authorization'));
    if (c.req.method === 'DELETE') {
      const previous = await store.read(id, token);
      if (!(await store.remove(id, token)))
        throw new LabError(
          'CARD_NOT_FOUND',
          'This saved card is unavailable.',
          404,
        );
      runner.forgetCard(previous?.id ?? id);
      return c.json({
        removed: true,
        removal:
          store instanceof MongoCardStore
            ? await store.removalState(id, token)
            : null,
      });
    }
    const record = await store.read(id, token);
    if (!record)
      throw new LabError(
        'CARD_NOT_FOUND',
        'This saved card is unavailable.',
        404,
      );
    return c.json({ monster: record });
  });
  app.get('/api/v1/cards/:id/removal', async (c) => {
    if (!(store instanceof MongoCardStore))
      throw new LabError(
        'CARD_NOT_FOUND',
        'This specimen is unavailable.',
        404,
      );
    const state = await store.removalState(
      c.req.param('id'),
      accessToken(c.req.header('Authorization')),
    );
    if (!state)
      throw new LabError(
        'CARD_NOT_FOUND',
        'This specimen is unavailable.',
        404,
      );
    return c.json(state);
  });
  app.post('/api/v1/rituals/:id/cancel', (c) =>
    c.json(runner.cancel(c.req.param('id'), c.get('scope'))),
  );
  return app;
}
