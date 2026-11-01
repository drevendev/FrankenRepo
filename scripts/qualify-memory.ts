import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { BackboardMemory, MongoCardStore } from '@frankenrepo/adapters';
const store = new MongoCardStore(
  process.env.MONGODB_URI!,
  process.env.MONGODB_DB ?? 'frankenrepo',
);
const receipt: Record<string, unknown> = {
  kind: 'LIVE_BACKBOARD_TEST_ONLY_MEMORY_LIFECYCLE',
  at: new Date().toISOString(),
  publicCorpus: false,
  humanApprovedCorpusUsed: false,
  modelCalled: false,
  checks: {},
  status: 'failed',
};
const checks = receipt.checks as Record<string, unknown>;
const noteId = 'test-only-' + randomUUID();
let memory: BackboardMemory | undefined;
try {
  const approval = JSON.parse(
    await readFile('.local/notebook-approval.json', 'utf8'),
  );
  if (
    approval.humanApproved !== true ||
    approval.allowDisposableLifecycle !== true
  )
    throw new Error('EXPLICIT_DISPOSABLE_MEMORY_APPROVAL_REQUIRED');
  const reservation = await store.controls.reserve({
    scope: 'memory-qualification',
    key: noteId,
    fingerprint: 'disposable memory lifecycle; never approved for generation',
    kind: 'backboard',
    calls: 4,
    maxUsd: 0.15,
    dailyCalls: 100,
    maxParallel: 1,
  });
  const r = await fetch('https://app.backboard.io/api/assistants', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.BACKBOARD_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'FrankenRepo disposable memory qualification',
      description: 'Test-only manual memory; no chat or model routing.',
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error('ASSISTANT_HTTP_' + r.status);
  const created = await r.json();
  memory = new BackboardMemory(
    process.env.BACKBOARD_API_KEY!,
    created.assistant_id,
    store,
    0.02,
  );
  receipt.balanceBefore = await memory.checkFreeBudget();
  const content =
    'TEST ONLY, NOT APPROVED FOR GENERATION: a HungryCrab and desktop-fly prototype needs a named digest field, an explicit mapping into movement, and an output for human inspection.';
  const write = await memory.request(
    'assistants/' + created.assistant_id + '/memories',
    'POST',
    {
      content,
      metadata: {
        source: 'disposable-frankenrepo-qualification',
        not_public_corpus: true,
      },
    },
  );
  if (typeof write.memory_id !== 'string') throw new Error('MEMORY_ID_MISSING');
  await store.notebook().insertOne({
    _id: noteId,
    cardId: noteId,
    memoryId: write.memory_id,
    text: content,
    source: 'test-only disposable qualification',
    approved: false,
    consented: false,
    revoked: false,
    deletion: 'none',
  });
  checks.manualWrite = true;
  // New adapter/client object; only provider memory is relied on, not local state.
  const fresh = new BackboardMemory(
    process.env.BACKBOARD_API_KEY!,
    created.assistant_id,
    store,
    0.02,
  );
  const search = await fresh.request(
    'assistants/' + created.assistant_id + '/memories/search',
    'POST',
    {
      query: 'HungryCrab digest field mapped into desktop-fly movement',
      limit: 3,
    },
  );
  const matches = Array.isArray(search.memories)
    ? (search.memories as {
        memory_id?: string;
        id?: string;
        content?: string;
      }[])
    : [];
  checks.retrievedAfterNewAdapter = matches.some(
    (m) => (m.memory_id ?? m.id) === write.memory_id && m.content === content,
  );
  checks.unapprovedResultCannotEnterPrompt =
    (await store.notebook().findOne({
      memoryId: write.memory_id,
      approved: true,
      consented: true,
      revoked: false,
    })) === null;
  await store
    .notebook()
    .updateOne(
      { _id: noteId },
      { $set: { revoked: true, deletion: 'pending' } },
    );
  receipt.deletion = await fresh.drainDeletions();
  const after = await fresh.request(
    'assistants/' + created.assistant_id + '/memories/search',
    'POST',
    {
      query: 'HungryCrab digest field mapped into desktop-fly movement',
      limit: 3,
    },
  );
  checks.deletedFromProvider =
    Array.isArray(after.memories) &&
    !after.memories.some(
      (m: { memory_id?: string; id?: string }) =>
        (m.memory_id ?? m.id) === write.memory_id,
    );
  receipt.balanceAfter = await fresh.checkFreeBudget();
  await store.controls.finish(reservation.operation.id, 'completed');
  receipt.status = Object.values(checks).every((v) => v === true)
    ? 'passed'
    : 'failed';
} catch (error) {
  receipt.error =
    error instanceof Error && /^[A-Z_0-9]+$/.test(error.message)
      ? error.message
      : 'SANITIZED_MEMORY_FAILURE';
  process.exitCode = 1;
} finally {
  if (memory) {
    await store
      .notebook()
      .updateOne(
        { _id: noteId },
        { $set: { revoked: true, deletion: 'pending' } },
      )
      .catch(() => {});
    await memory.drainDeletions().catch(() => {});
  }
  await store.close();
  await writeFile(
    'docs/eval/BACKBOARD_LIFECYCLE.json',
    JSON.stringify(receipt, null, 2) + '\n',
  );
  console.log(JSON.stringify(receipt));
}
