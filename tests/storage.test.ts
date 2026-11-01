import { expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../apps/api/src/app';
import { readConfig } from '../apps/api/src/config';
import { LabError, type MonsterRecord } from '@frankenrepo/core';
import type { CardStore } from '@frankenrepo/adapters';
import { TEST_DRAFT, genome } from './fixtures';

it('saves a completed ritual once, survives a new API instance, rejects missing/wrong keys and deletes privately', async () => {
  const records = new Map<string, MonsterRecord>();
  const token = 'a'.repeat(43),
    id = randomUUID();
  const save = vi.fn(async (record: MonsterRecord) => {
    records.set(id, record);
    return { id, token };
  });
  const store: CardStore = {
    ping: async () => {},
    save,
    read: async (id, t) => (t === token ? (records.get(id) ?? null) : null),
    remove: async (id, t) => t === token && records.delete(id),
  };
  const generate = vi.fn(async () => ({
    value: TEST_DRAFT,
    model: 'TEST FIXTURE',
    provider: 'ollama' as const,
  }));
  const config = readConfig({ MODEL_PROVIDER: 'disabled' });
  const app = createApp({
    config,
    store,
    model: { capability: () => 'unknown', generate },
    github: { inspect: async (ref, slot) => genome(slot, ref) },
  });
  const start = await app.request('/api/v1/rituals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      donors: ['test/brain', 'test/body'],
      mode: 'useful',
      clientRequestId: randomUUID(),
    }),
  });
  const job = await start.json();
  for (let n = 0; n < 50; n++) {
    if (
      (await (await app.request('/api/v1/rituals/' + job.ritualId)).json())
        .state === 'completed'
    )
      break;
    await new Promise((r) => setTimeout(r, 5));
  }
  const [a, b] = await Promise.all([
    app.request('/api/v1/rituals/' + job.ritualId + '/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }),
    app.request('/api/v1/rituals/' + job.ritualId + '/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }),
  ]);
  expect(await a.json()).toEqual({ id, token });
  expect(await b.json()).toEqual({ id, token });
  expect(save).toHaveBeenCalledTimes(1);
  expect(generate).toHaveBeenCalledTimes(1);
  const restarted = createApp({ config, store });
  expect((await (await restarted.request('/readyz')).json()).storage).toBe(
    'ready',
  );
  expect((await restarted.request('/api/v1/cards/' + id)).status).toBe(404);
  expect(
    (
      await restarted.request('/api/v1/cards/' + id, {
        headers: { Authorization: 'Bearer ' + 'b'.repeat(43) },
      })
    ).status,
  ).toBe(404);
  const read = await restarted.request('/api/v1/cards/' + id, {
    headers: { Authorization: 'Bearer ' + token },
  });
  expect(read.headers.get('Cache-Control')).toBe('no-store');
  expect((await read.json()).monster.draft).toEqual(TEST_DRAFT);
  expect((await restarted.request('/api/v1/gallery')).status).toBe(404);
  expect(
    (
      await restarted.request('/api/v1/cards/' + id, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await restarted.request('/api/v1/cards/' + id, {
        headers: { Authorization: 'Bearer ' + token },
      })
    ).status,
  ).toBe(404);
});

it('reports unavailable storage independently and sanitizes unexpected storage errors', async () => {
  const store: CardStore = {
    ping: async () => {
      throw new Error('SECRET_URI');
    },
    save: async () => {
      throw new LabError('STORAGE_UNAVAILABLE', 'Archive unavailable', 503);
    },
    read: async () => {
      throw new Error('SECRET_URI');
    },
    remove: async () => false,
  };
  const app = createApp({ config: readConfig({}), store });
  expect((await (await app.request('/readyz')).json()).storage).toBe(
    'unavailable',
  );
  const response = await app.request('/api/v1/cards/' + randomUUID(), {
    headers: { Authorization: 'Bearer ' + 'a'.repeat(43) },
  });
  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain('SECRET_URI');
});
