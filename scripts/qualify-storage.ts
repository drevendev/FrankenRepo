import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import {
  MongoCardStore,
  MongoControls,
  type Ledger,
} from '@frankenrepo/adapters';
import type { MonsterRecord } from '@frankenrepo/core';
const receipt: Record<string, unknown> = {
  kind: 'LIVE_ATLAS_QUALIFICATION',
  startedAt: new Date().toISOString(),
  providerMock: false,
  modelCalled: false,
  checks: {},
  status: 'failed',
};
const checks = receipt.checks as Record<string, unknown>;
const envPath = '.env';
const env = await readFile(envPath, 'utf8');
if (!/^SESSION_SECRET=/m.test(env))
  await writeFile(
    envPath,
    env.trimEnd() +
      '\nSESSION_SECRET=' +
      randomBytes(48).toString('base64url') +
      '\n',
  );
const uri = process.env.MONGODB_URI!,
  database = process.env.MONGODB_DB ?? 'frankenrepo';
let store = new MongoCardStore(uri, database);
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
const testCollection = client
  .db(database)
  .collection<Ledger>('qualification_usage_v2');
const jobs = client.db(database).collection<{
  _id: string;
  scope: string;
  job: import('@frankenrepo/core').RitualJob;
  expiresAt: Date;
}>('qualification_jobs_v2');
let access: { id: string; token: string } | undefined;
try {
  const historic = JSON.parse(
    await readFile(
      'docs/eval/runs/2026-10-27T23-15-18-165Z-chaotic-browser.json',
      'utf8',
    ),
  );
  const record: MonsterRecord = historic.record;
  if (!record) throw new Error('HISTORICAL_RECORD_MISSING');
  await store.ping();
  checks.ping = true;
  access = { id: randomUUID(), token: randomBytes(32).toString('base64url') };
  await store.save(record, access);
  const same = await store.save(record, access);
  checks.idempotentSave = same.id === access.id;
  await store.close();
  store = new MongoCardStore(uri, database);
  checks.readAfterClientRestart =
    (await store.read(access.id, access.token))?.contentHash ===
    record.contentHash;
  checks.wrongKeyDenied =
    (await store.read(access.id, randomBytes(32).toString('base64url'))) ===
    null;
  checks.wrongKeyDeleteDenied = !(await store.remove(
    access.id,
    randomBytes(32).toString('base64url'),
  ));
  const publication = await store.publish(access.id, access.token);
  const publicCard = await store.exhibit(publication.publicId);
  checks.publicRead = publicCard?.draft.name === record.draft.name;
  checks.noTokenInPublicProjection = !JSON.stringify(publicCard).includes(
    access.token,
  );
  await store.unpublish(access.id, access.token);
  checks.publicReadRevoked =
    (await store.exhibit(publication.publicId)) === null;
  checks.deleted = await store.remove(access.id, access.token);
  checks.readAfterDeleteDenied =
    (await store.read(access.id, access.token)) === null;
  try {
    await store.save(record, access);
    checks.deletedOperationCannotRecreate = false;
  } catch {
    checks.deletedOperationCannotRecreate = true;
  }
  access = undefined;
  await testCollection.deleteOne({ _id: 'frankenrepo-controls-v2' });
  const controls = new MongoControls(testCollection, jobs);
  await controls.init();
  const reservations = await Promise.allSettled(
    Array.from({ length: 20 }, (_, n) =>
      controls.reserve({
        scope: 'live-cas-' + n,
        key: 'request-' + n,
        fingerprint: 'isolated-budget-qualification',
        kind: 'gemma',
        calls: 2,
        maxUsd: 0,
        dailyCalls: 6,
        maxParallel: 20,
      }),
    ),
  );
  const passed = reservations.filter((r) => r.status === 'fulfilled');
  checks.concurrentReservationsAccepted = passed.length;
  checks.concurrentCallsReserved = (await controls.quota('gemma', 6)).reserved;
  if (passed.length !== 3 || checks.concurrentCallsReserved !== 6)
    throw new Error('CAS_BUDGET_FAILURE');
  const first = passed[0];
  if (first.status !== 'fulfilled') throw new Error('NO_RESERVATION');
  const op = first.value.operation;
  await controls.finish(op.id, 'unknown');
  const restarted = new MongoControls(testCollection, jobs);
  const duplicate = await restarted.reserve({
    scope: op.scope,
    key: 'request-' + op.scope.split('-').at(-1),
    fingerprint: op.fingerprint,
    kind: 'gemma',
    calls: 2,
    maxUsd: 0,
    dailyCalls: 6,
    maxParallel: 20,
  });
  checks.restartDuplicateNoNewReservation =
    duplicate.operation.id === op.id && !duplicate.fresh;
  checks.unknownRetainsReservation =
    (await restarted.quota('gemma', 6)).reserved === 6;
  receipt.status = Object.values(checks).every(
    (v) => v === true || typeof v === 'number',
  )
    ? 'passed'
    : 'failed';
} catch (error) {
  receipt.error =
    error instanceof Error && /^[A-Z_]+$/.test(error.message)
      ? error.message
      : 'SANITIZED_STORAGE_FAILURE';
  process.exitCode = 1;
} finally {
  if (access) await store.remove(access.id, access.token).catch(() => {});
  await testCollection
    .deleteOne({ _id: 'frankenrepo-controls-v2' })
    .catch(() => {});
  await store.close();
  await client.close();
  receipt.endedAt = new Date().toISOString();
  await mkdir('docs/eval', { recursive: true });
  await writeFile(
    'docs/eval/ATLAS_V2_QUALIFICATION.json',
    JSON.stringify(receipt, null, 2) + '\n',
  );
  console.log(JSON.stringify(receipt));
}
