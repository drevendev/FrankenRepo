import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { MongoCardStore } from '@frankenrepo/adapters';
import type { MonsterRecord, RitualJob } from '@frankenrepo/core';
const action = process.argv[2],
  recordPath = process.argv[3];
if (
  !['review', 'revision', 'permissions'].includes(action) ||
  !recordPath?.startsWith('docs/eval/runs/') ||
  recordPath.includes('..')
)
  throw new Error(
    'Choose review/revision/permissions and an existing real receipt.',
  );
const cards = JSON.parse(
  await readFile('.local/qualification-cards.json', 'utf8'),
) as { id: string; token: string; recordPath: string }[];
const access = cards.find((c) => c.recordPath === recordPath);
if (!access) throw new Error('Restore an existing saved operator card first.');
const store = new MongoCardStore(
  process.env.MONGODB_URI!,
  process.env.MONGODB_DB ?? 'frankenrepo',
);
const origin = 'http://127.0.0.1:3002';
const session = await fetch(origin + '/readyz');
const cookie = session.headers.get('set-cookie')?.split(';')[0] ?? '';
const receipt: Record<string, unknown> = {
  kind: 'LIVE_CARD_' + action.toUpperCase(),
  startedAt: new Date().toISOString(),
  inputReceipt: recordPath,
  status: 'failed',
  publicHosting: false,
};
const call = async (
  path: string,
  body?: unknown,
  method?: string,
  token = access.token,
) => {
  const r = await fetch(origin + path, {
    method: method ?? (body ? 'POST' : 'GET'),
    headers: {
      Cookie: cookie,
      Authorization: 'Bearer ' + token,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const result = await r.json();
  if (!r.ok) throw new Error(result.code ?? 'API_UNAVAILABLE');
  return result;
};
try {
  const saved = await call('/api/v1/cards/' + access.id);
  const original: MonsterRecord = saved.monster;
  receipt.readAfterServerRestart = true;
  if (action === 'permissions') {
    try {
      await call('/api/v1/cards/' + access.id + '/publication', {});
      receipt.explicitConsentRequired = false;
    } catch (error) {
      receipt.explicitConsentRequired =
        (error as Error).message === 'INVALID_INPUT';
    }
    const publication = await call(
      '/api/v1/cards/' + access.id + '/publication',
      { confirmed: true },
    );
    const read = await fetch(
      origin + '/api/v1/exhibits/' + publication.publicId,
    );
    const exposed = await read.json();
    receipt.publicRead = read.ok;
    receipt.noOwnerToken = !JSON.stringify(exposed).includes(access.token);
    receipt.noPrivateRevisionContext = !exposed.monster?.context?.revision;
    await call(
      '/api/v1/cards/' + access.id + '/publication',
      undefined,
      'DELETE',
    );
    receipt.unpublishRevokesPublicRead =
      (await fetch(origin + '/api/v1/exhibits/' + publication.publicId))
        .status === 404;
  } else {
    const operations = await store.controls.mutate((l) =>
      l.operations.filter(
        (o) => o.kind === 'ultramarine' && o.scope === 'card:' + access.id,
      ),
    );
    let reviewJobId = operations.at(-1)?.id;
    if (action === 'review') {
      reviewJobId = (
        await call('/api/v1/cards/' + access.id + '/reviews', {
          confirmed: true,
          clientRequestId: randomUUID(),
        })
      ).jobId;
      for (let n = 0; n < 45; n++) {
        await new Promise((r) => setTimeout(r, 1000));
        const result = await call(
          '/api/v1/cards/' + access.id + '/reviews/' + reviewJobId,
        );
        if (result.review) {
          receipt.review = result.review;
          break;
        }
        if (result.state === 'unavailable')
          throw new Error(result.error?.code ?? 'REVIEW_UNAVAILABLE');
      }
      if (!receipt.review) throw new Error('REVIEW_CONFIRMATION_TIMEOUT');
    } else {
      if (!reviewJobId) throw new Error('COMPLETED_REVIEW_REQUIRED');
      const start = await call('/api/v1/cards/' + access.id + '/revisions', {
        confirmed: true,
        clientRequestId: randomUUID(),
        reviewJobId,
      });
      let revised: MonsterRecord | undefined;
      for (let n = 0; n < 210; n++) {
        await new Promise((r) => setTimeout(r, 1000));
        const job: RitualJob = await call('/api/v1/rituals/' + start.ritualId);
        if (job.state === 'completed') {
          revised = job.monster;
          break;
        }
        if (job.error) throw new Error(job.error.code);
      }
      if (!revised) throw new Error('REVISION_CONFIRMATION_TIMEOUT');
      receipt.originalContentHash = original.contentHash;
      receipt.originalStillUnchanged =
        (await call('/api/v1/cards/' + access.id)).monster.contentHash ===
        original.contentHash;
      receipt.frozenSnapshots =
        JSON.stringify(original.parents) === JSON.stringify(revised.parents);
      receipt.record = revised;
      const next = await call(
        '/api/v1/rituals/' + start.ritualId + '/save',
        {},
      );
      cards.push({
        ...next,
        recordPath:
          'docs/eval/runs/' +
          new Date().toISOString().replace(/[:.]/g, '-') +
          '-revision.json',
      });
      await writeFile(
        '.local/qualification-cards.json',
        JSON.stringify(cards, null, 2),
      );
    }
  }
  receipt.status = 'passed';
} catch (error) {
  receipt.error =
    error instanceof Error && /^[A-Z_]+$/.test(error.message)
      ? error.message
      : 'SANITIZED_ACTION_FAILURE';
  process.exitCode = 1;
} finally {
  receipt.endedAt = new Date().toISOString();
  await store.close();
  const path =
    'docs/eval/runs/' +
    receipt.startedAt!.toString().replace(/[:.]/g, '-') +
    '-' +
    action +
    '.json';
  await writeFile(path, JSON.stringify(receipt, null, 2) + '\n');
  console.log(
    JSON.stringify({
      path,
      status: receipt.status,
      error: receipt.error,
      name: (receipt.record as MonsterRecord | undefined)?.draft.name,
    }),
  );
}
