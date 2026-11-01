import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { BackboardMemory, MongoCardStore } from '@frankenrepo/adapters';
import type { MonsterRecord } from '@frankenrepo/core';
const action = process.argv[2];
if (!['seed', 'search', 'delete', 'drain'].includes(action))
  throw new Error('Choose seed/search/delete/drain.');
const store = new MongoCardStore(
  process.env.MONGODB_URI!,
  process.env.MONGODB_DB ?? 'frankenrepo',
);
const receipt: Record<string, unknown> = {
  kind: 'LIVE_BACKBOARD_' + action.toUpperCase(),
  startedAt: new Date().toISOString(),
  source:
    'Approved manual editorial notes on historical real cards; not automatic Backboard discoveries',
  results: [],
  status: 'failed',
};
await mkdir('.local', { recursive: true });
try {
  if (action === 'seed') {
    const corpusRaw = await readFile(
      'docs/partners/NOTEBOOK_CORPUS.json',
      'utf8',
    );
    const approval = JSON.parse(
      await readFile('.local/notebook-approval.json', 'utf8'),
    );
    if (
      approval.humanApproved !== true ||
      approval.corpusSha256 !==
        createHash('sha256').update(corpusRaw).digest('hex')
    )
      throw new Error('PUBLIC_CORPUS_HUMAN_APPROVAL_REQUIRED');
  }
  let assistantId: string;
  try {
    assistantId = JSON.parse(
      await readFile('.local/notebook-assistant.json', 'utf8'),
    ).id;
  } catch {
    if (action !== 'seed') throw new Error('NOTEBOOK_NOT_SEEDED');
    const r = await fetch('https://app.backboard.io/api/assistants', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.BACKBOARD_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'FrankenRepo approved experiment lessons',
        description:
          'Manual public editorial lessons only; no chat, web search, or automatic memory extraction.',
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error('ASSISTANT_CREATE_HTTP_' + r.status);
    const created = await r.json();
    assistantId = created.assistant_id;
    if (!/^[a-f0-9-]{36}$/i.test(assistantId))
      throw new Error('ASSISTANT_ID_MISSING');
    await writeFile(
      '.local/notebook-assistant.json',
      JSON.stringify({ id: assistantId }, null, 2),
    );
  }
  const memory = new BackboardMemory(
    process.env.BACKBOARD_API_KEY!,
    assistantId,
    store,
    0.02,
  );
  receipt.balanceBefore = await memory.checkFreeBudget();
  if (action === 'seed') {
    const raw = await readFile('docs/partners/NOTEBOOK_CORPUS.json', 'utf8');
    const hash = createHash('sha256').update(raw).digest('hex');
    const approved = JSON.parse(
      await readFile('.local/notebook-approval.json', 'utf8'),
    );
    if (approved.corpusSha256 !== hash || approved.humanApproved !== true)
      throw new Error('PUBLIC_CORPUS_HUMAN_APPROVAL_REQUIRED');
    const corpus = JSON.parse(raw) as {
      notes: { id: string; text: string; source: string; cardPath: string }[];
    };
    if (corpus.notes.length > 10) throw new Error('CORPUS_LIMIT');
    for (const note of corpus.notes) {
      if (
        note.text.length > 500 ||
        !note.cardPath.startsWith('docs/eval/runs/') ||
        note.cardPath.includes('..')
      )
        throw new Error('INVALID_APPROVED_NOTE');
      const card: MonsterRecord = JSON.parse(
        await readFile(note.cardPath, 'utf8'),
      ).record;
      const prior = await store.notebook().findOne({ _id: note.id });
      if (prior?.memoryId) {
        (receipt.results as unknown[]).push({ id: note.id, state: 'existing' });
        continue;
      }
      const reservation = await store.controls.reserve({
        scope: 'notebook-operator',
        key: 'write:' + note.id,
        fingerprint: hash,
        kind: 'backboard',
        calls: 1,
        maxUsd: 0.05,
        dailyCalls: 100,
        maxParallel: 1,
      });
      if (!reservation.fresh)
        throw new Error('UNKNOWN_MEMORY_WRITE_REQUIRES_RECONCILIATION');
      await store.notebook().updateOne(
        { _id: note.id },
        {
          $setOnInsert: {
            cardId: 'historical:' + card.id,
            memoryId: null,
            text: note.text,
            source: note.source,
            approved: true,
            consented: true,
            revoked: false,
            deletion: 'none',
          },
        },
        { upsert: true },
      );
      await memory.checkFreeBudget();
      try {
        const result = await memory.request(
          'assistants/' + assistantId + '/memories',
          'POST',
          {
            content: note.text,
            metadata: {
              source: 'manual-human-approved-frankenrepo-editorial',
              card_id: card.id,
              content_hash: card.contentHash,
              note_id: note.id,
              approval_version: hash,
            },
          },
        );
        if (typeof result.memory_id !== 'string')
          throw new Error('MEMORY_ID_MISSING');
        await store
          .notebook()
          .updateOne(
            { _id: note.id },
            { $set: { memoryId: result.memory_id } },
          );
        await store.controls.finish(reservation.operation.id, 'completed');
        (receipt.results as unknown[]).push({
          id: note.id,
          memoryId: result.memory_id,
          state: 'stored',
          cardContentHash: card.contentHash,
        });
      } catch (error) {
        await store.controls.finish(reservation.operation.id, 'unknown');
        throw error;
      }
    }
    const text = await readFile('.env', 'utf8');
    const next = text
      .replace(/^BACKBOARD_ASSISTANT_ID=.*\r?\n?/gm, '')
      .replace(/^BACKBOARD_MAX_READ_USD=.*\r?\n?/gm, '');
    await writeFile(
      '.env',
      next.trimEnd() +
        '\nBACKBOARD_ASSISTANT_ID=' +
        assistantId +
        '\nBACKBOARD_MAX_READ_USD=0.02\n',
    );
  } else if (action === 'search') {
    const recordPath = process.argv[3];
    if (!recordPath?.startsWith('docs/eval/runs/') || recordPath.includes('..'))
      throw new Error('FIXED_CARD_RECEIPT_REQUIRED');
    const record: MonsterRecord = JSON.parse(
      await readFile(recordPath, 'utf8'),
    ).record;
    receipt.context = await memory.search(record.parents);
  } else if (action === 'delete') {
    const id = process.argv[3];
    if (!id || !/^[a-z-]{1,80}$/.test(id))
      throw new Error('EXPLICIT_NOTE_ID_REQUIRED');
    await store
      .notebook()
      .updateOne({ _id: id }, { $set: { revoked: true, deletion: 'pending' } });
    receipt.results = await memory.drainDeletions();
    receipt.manifestRevoked =
      (await store.notebook().findOne({ _id: id }))?.revoked === true;
  } else receipt.results = await memory.drainDeletions();
  receipt.balanceAfter = await memory.checkFreeBudget();
  receipt.status = 'passed';
} catch (error) {
  receipt.error =
    error instanceof Error && /^[A-Z_0-9]+$/.test(error.message)
      ? error.message
      : 'SANITIZED_MEMORY_FAILURE';
  process.exitCode = 1;
} finally {
  receipt.endedAt = new Date().toISOString();
  await store.close();
  await writeFile(
    'docs/eval/BACKBOARD_' + action.toUpperCase() + '_' + Date.now() + '.json',
    JSON.stringify(receipt, null, 2) + '\n',
  );
  console.log(JSON.stringify(receipt));
}
