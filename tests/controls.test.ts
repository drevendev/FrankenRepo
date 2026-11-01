import { describe, expect, it } from 'vitest';
import {
  emptyLedger,
  reserveInLedger,
  type Reservation,
} from '@frankenrepo/adapters';
const request = (
  key: string,
  extra: Partial<Reservation> = {},
): Reservation => ({
  scope: key,
  key,
  fingerprint: 'fixed-input',
  kind: 'gemma',
  calls: 2,
  maxUsd: 0,
  dailyCalls: 20,
  maxParallel: 1,
  now: Date.UTC(2026, 9, 31, 12),
  ...extra,
});
describe('durable reservation policy (pure policy tests, not Atlas evidence)', () => {
  it('reuses the same operation after serialized restart, conflicts on changed input, and keeps unknown budget', () => {
    const ledger = emptyLedger();
    const first = reserveInLedger(ledger, request('one')).operation;
    first.state = 'unknown';
    const restored = JSON.parse(JSON.stringify(ledger));
    expect(reserveInLedger(restored, request('one'))).toEqual({
      operation: first,
      fresh: false,
    });
    expect(() =>
      reserveInLedger(restored, request('one', { fingerprint: 'changed' })),
    ).toThrow(/different inputs/);
    for (let n = 1; n < 10; n++)
      reserveInLedger(restored, request('next' + n)).operation.state =
        'unknown';
    expect(() => reserveInLedger(restored, request('overflow'))).toThrow(
      /daily call budget/,
    );
  });
  it('enforces active global concurrency and three starts per browser window', () => {
    const ledger = emptyLedger();
    const first = reserveInLedger(ledger, request('one')).operation;
    expect(() => reserveInLedger(ledger, request('two'))).toThrow(/occupied/);
    first.state = 'completed';
    for (const key of ['two', 'three'])
      reserveInLedger(ledger, request(key, { scope: 'one' })).operation.state =
        'completed';
    expect(() =>
      reserveInLedger(ledger, request('four', { scope: 'one' })),
    ).toThrow(/three rituals/);
  });
  it('shares model-action concurrency across providers while allowing nested memory, and keeps guest windows across UTC midnight', () => {
    const ledger = emptyLedger();
    const first = reserveInLedger(
      ledger,
      request('first', {
        now: Date.UTC(2026, 9, 31, 23, 59),
        scope: 'visitor',
      }),
    ).operation;
    expect(() =>
      reserveInLedger(
        ledger,
        request('review', {
          kind: 'ultramarine',
          calls: 1,
          maxUsd: 0.1,
          now: Date.UTC(2026, 9, 31, 23, 59),
        }),
      ),
    ).toThrow(/occupied/);
    expect(
      reserveInLedger(
        ledger,
        request('memory', {
          kind: 'backboard',
          calls: 1,
          maxUsd: 0.02,
          now: Date.UTC(2026, 9, 31, 23, 59),
        }),
      ).fresh,
    ).toBe(true);
    first.state = 'completed';
    for (const key of ['second', 'third'])
      reserveInLedger(
        ledger,
        request(key, { scope: 'visitor', now: Date.UTC(2026, 10, 1, 0, 1) }),
      ).operation.state = 'completed';
    expect(() =>
      reserveInLedger(
        ledger,
        request('fourth', {
          scope: 'visitor',
          now: Date.UTC(2026, 10, 1, 0, 1),
        }),
      ),
    ).toThrow(/three rituals/);
  });
  it('keeps global spending across day boundaries and permits one revision only when no repair was used', () => {
    const ledger = emptyLedger();
    const original = reserveInLedger(ledger, request('one')).operation;
    original.state = 'completed';
    const revision = request('revision', { revisionOf: original.id, calls: 1 });
    expect(() => reserveInLedger(ledger, revision)).toThrow(/allowance/);
    original.attempts.push({
      id: 'first',
      model: 'test-only',
      startedAt: '2026-10-31T12:00:00Z',
      outcome: 'completed',
      inputTokens: null,
      outputTokens: null,
      costUsd: null,
    });
    reserveInLedger(ledger, revision).operation.state = 'completed';
    expect(() =>
      reserveInLedger(ledger, { ...revision, key: 'other' }),
    ).toThrow(/allowance/);
    const reviews = emptyLedger();
    for (let n = 0; n < 20; n++)
      reserveInLedger(
        reviews,
        request('review' + n, {
          kind: 'ultramarine',
          calls: 1,
          maxUsd: 0.1,
          dailyCalls: 5,
          now: Date.UTC(2026, 9, 1 + Math.floor(n / 5)),
        }),
      ).operation.state = 'unknown';
    expect(() =>
      reserveInLedger(
        reviews,
        request('review-overflow', {
          kind: 'ultramarine',
          calls: 1,
          maxUsd: 0.1,
          dailyCalls: 5,
        }),
      ),
    ).toThrow(/credit/);
  });
});
