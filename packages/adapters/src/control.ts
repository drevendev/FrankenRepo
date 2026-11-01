import { createHash, randomUUID } from 'node:crypto';
import type { Collection } from 'mongodb';
import { LabError, type RitualJob } from '@frankenrepo/core';

export type Operation = {
  id: string;
  scope: string;
  key: string;
  fingerprint: string;
  kind: 'gemma' | 'ultramarine' | 'backboard';
  state: 'reserved' | 'started' | 'completed' | 'failed' | 'unknown';
  created: number;
  lease: number;
  calls: number;
  maxUsd: number;
  attempts: {
    id: string;
    model: string;
    startedAt: string;
    outcome: string;
    inputTokens: number | null;
    outputTokens: number | null;
    costUsd: number | null;
  }[];
  revisionOf?: string;
};
export type Ledger = {
  _id: string;
  version: number;
  operations: Operation[];
  cardSlots: string[];
};
export type Reservation = {
  scope: string;
  key: string;
  fingerprint: string;
  kind: Operation['kind'];
  calls: number;
  maxUsd: number;
  dailyCalls: number;
  maxParallel: number;
  now?: number;
  revisionOf?: string;
};
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export const emptyLedger = (): Ledger => ({
  _id: 'frankenrepo-controls-v2',
  version: 0,
  operations: [],
  cardSlots: [],
});

// A single compare-and-swap document reserves ALL budgets and the dedupe key
// together. No multi-document refund can turn a network unknown into a retry.
export function reserveInLedger(
  ledger: Ledger,
  request: Reservation,
): { operation: Operation; fresh: boolean } {
  const now = request.now ?? Date.now();
  const key = hash(request.scope + ':' + request.key);
  const old = ledger.operations.find((o) => o.key === key);
  if (old) {
    if (
      old.fingerprint !== request.fingerprint &&
      !(
        old.fingerprint.startsWith('{') &&
        hash(old.fingerprint) === request.fingerprint
      )
    )
      throw new LabError(
        'IDEMPOTENCY_CONFLICT',
        'This operation ID already belongs to different inputs.',
        409,
      );
    return { operation: old, fresh: false };
  }
  if (request.revisionOf) {
    const original = ledger.operations.find((o) => o.id === request.revisionOf);
    if (
      !original ||
      original.state !== 'completed' ||
      original.attempts.length !== 1 ||
      ledger.operations.some((o) => o.revisionOf === request.revisionOf)
    )
      throw new LabError(
        'REVISION_LIMIT',
        'The original already used its repair or revision allowance.',
        409,
      );
  }
  if (ledger.operations.length >= 512)
    throw new LabError(
      'LEDGER_CAPACITY',
      'The durable experiment ledger is full. Operator review is required.',
      503,
    );
  const day = new Date(now).toISOString().slice(0, 10);
  const today = ledger.operations.filter((o) =>
    new Date(o.created).toISOString().startsWith(day),
  );
  const sameProvider = today.filter((o) => o.kind === request.kind);
  if (
    sameProvider.reduce((sum, o) => sum + o.calls, 0) + request.calls >
    request.dailyCalls
  )
    throw new LabError(
      'MODEL_QUOTA',
      'The durable daily call budget is exhausted. Uncertain attempts keep their reservation.',
      429,
    );
  const total = ledger.operations
    .filter((o) => o.kind === request.kind)
    .reduce((sum, o) => sum + o.maxUsd, 0);
  const dailyCost = sameProvider.reduce((sum, o) => sum + o.maxUsd, 0);
  const cap =
    request.kind === 'ultramarine'
      ? 2
      : request.kind === 'backboard'
        ? 1
        : Infinity;
  if (
    total + request.maxUsd > cap + 1e-9 ||
    (request.kind === 'ultramarine' && dailyCost + request.maxUsd > 0.5 + 1e-9)
  )
    throw new LabError(
      'CREDIT_CAP',
      'The reserved promotional-credit budget is exhausted.',
      429,
    );
  const active = ledger.operations.filter(
    (o) =>
      (request.kind === 'backboard'
        ? o.kind === 'backboard'
        : o.kind !== 'backboard') &&
      ['reserved', 'started'].includes(o.state) &&
      o.lease > now,
  );
  if (
    active.length >= request.maxParallel ||
    active.some((o) => o.scope === request.scope)
  )
    throw new LabError(
      'LAB_BUSY',
      'The reanimation table is occupied. Return when the current action finishes.',
      429,
      true,
    );
  if (
    ledger.operations.filter(
      (o) =>
        o.scope === request.scope &&
        o.kind === 'gemma' &&
        now - o.created < 900_000,
    ).length >= 3
  )
    throw new LabError(
      'RATE_LIMITED',
      'This visitor has reached three rituals in fifteen minutes.',
      429,
      true,
    );
  const operation: Operation = {
    id: randomUUID(),
    scope: request.scope,
    key,
    fingerprint: request.fingerprint,
    kind: request.kind,
    state: 'reserved',
    created: now,
    lease: now + 240_000,
    calls: request.calls,
    maxUsd: request.maxUsd,
    attempts: [],
  };
  ledger.operations.push(operation);
  if (request.revisionOf) operation.revisionOf = request.revisionOf;
  return { operation, fresh: true };
}

export class MongoControls {
  private initialized?: Promise<void>;
  constructor(
    private ledger: Collection<Ledger>,
    private jobs: Collection<{
      _id: string;
      scope: string;
      job: RitualJob;
      expiresAt: Date;
    }>,
  ) {}
  async init() {
    this.initialized ??= (async () => {
      await this.ledger.updateOne(
        { _id: 'frankenrepo-controls-v2' },
        { $setOnInsert: emptyLedger() },
        { upsert: true },
      );
      await this.jobs.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    })().catch(() => {
      this.initialized = undefined;
      throw new LabError(
        'STORAGE_UNAVAILABLE',
        'Durable budgets are unavailable; new inference is paused.',
        503,
      );
    });
    await this.initialized;
  }
  async mutate<T>(fn: (ledger: Ledger) => T): Promise<T> {
    await this.init();
    for (let retry = 0; retry < 24; retry++) {
      const ledger = await this.ledger.findOne({
        _id: 'frankenrepo-controls-v2',
      });
      if (!ledger)
        throw new LabError(
          'STORAGE_UNAVAILABLE',
          'Durable controls are unavailable.',
          503,
        );
      const version = ledger.version;
      const result = fn(ledger);
      ledger.version++;
      if (
        (await this.ledger.replaceOne({ _id: ledger._id, version }, ledger))
          .modifiedCount
      )
        return result;
    }
    throw new LabError(
      'LAB_BUSY',
      'Concurrent budget reservations could not settle. No provider was called.',
      429,
    );
  }
  async reserve(request: Reservation) {
    return this.mutate((l) => reserveInLedger(l, request));
  }
  async finish(id: string, state: Operation['state']) {
    await this.mutate((l) => {
      const o = l.operations.find((o) => o.id === id);
      if (o) o.state = state;
    });
  }
  async attempt(id: string, attempt: Operation['attempts'][number]) {
    await this.mutate((l) => {
      const o = l.operations.find((o) => o.id === id);
      if (!o || o.attempts.length >= o.calls)
        throw new LabError(
          'MODEL_QUOTA',
          'The reserved attempt limit was reached.',
          429,
        );
      o.state = 'started';
      o.attempts.push(attempt);
    });
  }
  async settleAttempt(
    id: string,
    attemptId: string,
    result: Partial<Operation['attempts'][number]>,
  ) {
    await this.mutate((l) => {
      const a = l.operations
        .find((o) => o.id === id)
        ?.attempts.find((a) => a.id === attemptId);
      if (a) Object.assign(a, result);
    });
  }
  async putJob(scope: string, job: RitualJob) {
    if (Buffer.byteLength(JSON.stringify(job)) > 48_000)
      throw new LabError(
        'RECORD_TOO_LARGE',
        'The job exceeds the bounded archive size.',
        413,
      );
    await this.jobs.replaceOne(
      { _id: job.ritualId },
      { scope, job, expiresAt: new Date(job.expiresAt) },
      { upsert: true },
    );
  }
  async getJob(id: string, scope: string): Promise<RitualJob | null> {
    await this.init();
    const found = await this.jobs.findOne({
      _id: id,
      scope,
      expiresAt: { $gt: new Date() },
    });
    const ledger = await this.ledger.findOne({
      _id: 'frankenrepo-controls-v2',
    });
    const operation = ledger?.operations.find(
      (o) => o.id === id && o.scope === scope,
    );
    if (found && ['completed', 'failed', 'cancelled'].includes(found.job.state))
      return found.job;
    if (operation && operation.lease < Date.now())
      return {
        ritualId: id,
        state: 'failed',
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(operation.created + 86400_000).toISOString(),
        error: {
          code: 'INTERRUPTED_UNKNOWN',
          message:
            'The previous worker stopped before confirming a result. Budget remains reserved; this operation will not retry inference.',
          retryable: false,
        },
      };
    return found?.job ?? null;
  }
  async redactCardJobs(cardId: string) {
    await this.jobs.updateMany(
      { 'job.monster.id': cardId },
      {
        $unset: { 'job.monster': '' },
        $set: {
          'job.state': 'failed',
          'job.error': {
            code: 'CARD_REMOVED',
            message: 'This specimen was deleted.',
            retryable: false,
          },
        },
      },
    );
  }
  async quota(kind: Operation['kind'], limit: number) {
    await this.init();
    const ledger = await this.ledger.findOne({
      _id: 'frankenrepo-controls-v2',
    });
    const day = new Date().toISOString().slice(0, 10);
    return {
      limit,
      reserved:
        ledger?.operations
          .filter(
            (o) =>
              o.kind === kind &&
              new Date(o.created).toISOString().startsWith(day),
          )
          .reduce((s, o) => s + o.calls, 0) ?? 0,
      basis: 'durable reservations; unused/unknown reservations retained',
      window: 'UTC day',
    };
  }
  async recentInference() {
    await this.init();
    const ledger = await this.ledger.findOne({
      _id: 'frankenrepo-controls-v2',
    });
    const last = ledger?.operations
      .filter((o) => o.kind === 'gemma' && o.state === 'completed')
      .at(-1);
    return last
      ? {
          completedAt: new Date(last.created).toISOString(),
          model: last.attempts.at(-1)?.model ?? null,
          note: 'A dated success does not guarantee current upstream availability.',
        }
      : null;
  }
}
