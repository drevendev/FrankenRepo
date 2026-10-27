import { describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../apps/api/src/app';
import { readConfig } from '../apps/api/src/config';
import { LabError } from '@frankenrepo/core';
import type { InferencePort } from '@frankenrepo/adapters';
import { RitualRunner } from '@frankenrepo/ritual';
import { TEST_DRAFT, genome } from './fixtures';
const config = () =>
  readConfig({ NODE_ENV: 'test', MODEL_PROVIDER: 'disabled' });
const github = {
  inspect: vi.fn(async (ref: string, slot: 'A' | 'B') => genome(slot, ref)),
};
function model(
  generate = vi.fn(async () => ({
    value: TEST_DRAFT,
    provider: 'ollama' as const,
    model: 'TEST FIXTURE',
  })),
): InferencePort {
  return { capability: () => 'unknown', generate };
}
const post = (
  app: ReturnType<typeof createApp>,
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
const payload = (clientRequestId = randomUUID()) => ({
  donors: ['test/brain', 'test/body'],
  mode: 'cursed',
  clientRequestId,
});
async function complete(runner: RitualRunner, id: string) {
  for (let i = 0; i < 60; i++) {
    const job = runner.get(id, 'scope');
    if (['completed', 'failed', 'cancelled'].includes(job.state)) return job;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error('test job did not finish');
}
describe('HTTP safety and capability contracts', () => {
  it('reports disabled model and storage independently; no public gallery', async () => {
    const app = createApp({ config: config(), github });
    expect(await (await app.request('/healthz')).json()).toEqual({
      status: 'ok',
    });
    expect(await (await app.request('/readyz')).json()).toMatchObject({
      model: 'disabled',
      storage: 'disabled',
      recordedSamples: 0,
    });
    expect((await app.request('/api/v1/gallery')).status).toBe(404);
    expect(
      (
        await post(app, '/api/v1/monsters/anything/publish', {
          confirmed: true,
        })
      ).status,
    ).toBe(404);
    const res = await post(app, '/api/v1/rituals', payload());
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      code: 'MODEL_DISABLED',
      requestId: expect.any(String),
    });
  });
  it('inspects two sources and rejects identical or malicious donors', async () => {
    const app = createApp({ config: config(), github });
    const res = await post(app, '/api/v1/donors/inspect', {
      donors: ['test/brain', 'test/body'],
    });
    expect(res.status).toBe(200);
    expect((await res.json()).donors).toHaveLength(2);
    expect(
      (
        await post(app, '/api/v1/donors/inspect', {
          donors: ['test/brain', 'TEST/brain'],
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await post(app, '/api/v1/donors/inspect', {
          donors: ['https://localhost/a/b', 'test/body'],
        })
      ).status,
    ).toBe(400);
  });
  it('rejects forbidden origins, non-JSON, oversized streamed input and malformed JSON', async () => {
    const app = createApp({ config: config(), github });
    expect(
      (
        await post(
          app,
          '/api/v1/donors/inspect',
          {},
          { Origin: 'https://evil.test' },
        )
      ).status,
    ).toBe(403);
    const options = await app.request('/api/v1/donors/inspect', {
      method: 'OPTIONS',
      headers: { Origin: 'http://127.0.0.1:5173' },
    });
    expect(options.status).toBe(204);
    expect(options.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://127.0.0.1:5173',
    );
    expect(
      (
        await app.request('/readyz', {
          headers: { Origin: 'http://127.0.0.1:3001' },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await app.request('/api/v1/donors/inspect', {
          method: 'POST',
          body: 'x',
        })
      ).status,
    ).toBe(415);
    expect(
      (
        await app.request('/api/v1/donors/inspect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'x'.repeat(20001),
        })
      ).status,
    ).toBe(413);
    expect(
      (
        await app.request('/api/v1/donors/inspect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{',
        })
      ).status,
    ).toBe(400);
  });
  it('does not expose upstream exception text or a stack', async () => {
    const app = createApp({
      config: config(),
      github: {
        inspect: async () => {
          throw new Error('secret-token-and-private-url');
        },
      },
    });
    const res = await post(app, '/api/v1/donors/inspect', {
      donors: ['a/b', 'a/c'],
    });
    expect(res.status).toBe(500);
    expect(await res.text()).not.toMatch(/secret|stack|private-url/);
  });
  it('caps donor inspection before unlimited upstream calls', async () => {
    const app = createApp({ config: config(), github });
    for (let i = 0; i < 12; i++)
      expect(
        (await post(app, '/api/v1/donors/inspect', { donors: ['a/b', 'a/c'] }))
          .status,
      ).toBe(200);
    const res = await post(app, '/api/v1/donors/inspect', {
      donors: ['a/b', 'a/c'],
    });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('900');
  });
  it('deduplicates HTTP generation IDs and rejects key reuse with new inputs', async () => {
    const app = createApp({ config: config(), github, model: model() });
    const body = payload();
    const first = await (await post(app, '/api/v1/rituals', body)).json();
    const second = await (await post(app, '/api/v1/rituals', body)).json();
    expect(first.ritualId).toBe(second.ritualId);
    expect(
      (await post(app, '/api/v1/rituals', { ...body, mode: 'useful' })).status,
    ).toBe(409);
    expect((await app.request('/api/v1/rituals/not-a-uuid')).status).toBe(404);
  });
});
describe('actual job state, bounded repair and cancellation (mock providers)', () => {
  it('builds server provenance and an ephemeral record, keeping IDs out of model control', async () => {
    const runner = new RitualRunner(github, model());
    const job = runner.start(
      'scope',
      randomUUID(),
      ['test/brain', 'test/body'],
      'cursed',
    );
    const result = await complete(runner, job.ritualId);
    expect(result.state).toBe('completed');
    expect(result.monster).toMatchObject({
      publication: { state: 'ephemeral' },
      model: { id: 'TEST FIXTURE' },
      draft: TEST_DRAFT,
    });
    expect(result.monster!.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(() => runner.get(job.ritualId, 'other')).toThrow();
  });
  it('makes exactly one repair for malformed drafts', async () => {
    const generate = vi.fn().mockResolvedValue({
      value: { name: 'bad' },
      provider: 'ollama',
      model: 'TEST FIXTURE',
    });
    const runner = new RitualRunner(github, {
      capability: () => 'unknown',
      generate,
    });
    const job = runner.start('scope', randomUUID(), ['a/b', 'a/c'], 'useful');
    expect((await complete(runner, job.ritualId)).state).toBe('failed');
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1][3]).toBe(true);
  });
  it('does not retry quota errors or fabricate success', async () => {
    const generate = vi
      .fn()
      .mockRejectedValue(
        new LabError('MODEL_QUOTA', 'Quota exhausted', 429, true),
      );
    const runner = new RitualRunner(github, {
      capability: () => 'unknown',
      generate,
    });
    const job = runner.start('scope', randomUUID(), ['a/b', 'a/c'], 'chaotic');
    const result = await complete(runner, job.ritualId);
    expect(result.error?.code).toBe('MODEL_QUOTA');
    expect(result.monster).toBeUndefined();
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it('aborts before inference if cancelled and enforces global concurrency', async () => {
    const generate = vi.fn(async () => ({
      value: TEST_DRAFT,
      provider: 'ollama' as const,
      model: 'TEST',
    }));
    const runner = new RitualRunner(github, model(generate));
    const job = runner.start('scope', randomUUID(), ['a/b', 'a/c'], 'cursed');
    expect(() =>
      runner.start('scope', randomUUID(), ['a/b', 'a/c'], 'useful'),
    ).toThrow();
    runner.cancel(job.ritualId, 'scope');
    expect((await complete(runner, job.ritualId)).state).toBe('cancelled');
    await new Promise((r) => setTimeout(r, 10));
    expect(generate).not.toHaveBeenCalled();
  });
  it('expires jobs and their idempotency keys', async () => {
    let now = 1;
    const runner = new RitualRunner(github, model(), {
      now: () => now,
      ttlMs: 10,
    });
    const key = randomUUID();
    const job = runner.start('scope', key, ['a/b', 'a/c'], 'cursed');
    await complete(runner, job.ritualId);
    now = 20;
    expect(() => runner.get(job.ritualId, 'scope')).toThrow();
    expect(runner.lookup('scope', key, 'anything')).toBeNull();
  });
});
