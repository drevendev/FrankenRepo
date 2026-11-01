import { randomUUID } from 'node:crypto';
import { LabError, type DonorGenome, type Lesson } from '@frankenrepo/core';
import type { MongoCardStore } from './storage';
import { boundedRequest, jsonValue, objectValue } from './http';
export class BackboardMemory {
  constructor(
    private key: string,
    private assistantId: string,
    private store: MongoCardStore,
    private maxReadUsd: number,
    private fetcher: typeof fetch = fetch,
  ) {
    if (
      !/^[a-f0-9-]{36}$/i.test(assistantId) ||
      !(maxReadUsd > 0 && maxReadUsd <= 0.02)
    )
      throw new LabError(
        'MEMORY_PRICE_UNVERIFIED',
        'Memory requires a verified conservative price cap.',
        503,
      );
  }
  async request(path: string, method = 'GET', body?: unknown) {
    const { response, text } = await boundedRequest(
      this.fetcher,
      'https://app.backboard.io/api/' + path,
      {
        method,
        headers: { 'X-API-Key': this.key, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
      { timeoutMs: 8000 },
    );
    if (method === 'DELETE' && response.status === 404) return {};
    if (!response.ok)
      throw new LabError(
        'MEMORY_UNAVAILABLE',
        'The laboratory notebook is unavailable. A ritual can continue without it.',
        503,
      );
    return response.status === 204 ? {} : objectValue(jsonValue(text));
  }
  async search(
    genomes: [DonorGenome, DonorGenome],
  ): Promise<{ lessons: Lesson[] }> {
    await this.checkFreeBudget();
    const query = genomes
      .map((g) => g.ref + ': ' + (g.description ?? 'description unknown'))
      .join(' + ')
      .slice(0, 800);
    const { operation } = await this.store.controls.reserve({
      scope: 'notebook',
      key: randomUUID(),
      fingerprint: 'approved-memory-search',
      kind: 'backboard',
      calls: 1,
      maxUsd: this.maxReadUsd,
      dailyCalls: 100,
      maxParallel: 1,
    });
    try {
      const result = await this.request(
        'assistants/' + this.assistantId + '/memories/search',
        'POST',
        { query, limit: 3 },
      );
      const memories = Array.isArray(result.memories)
        ? result.memories.slice(0, 3)
        : [];
      const lessons: Lesson[] = [];
      for (const item of memories) {
        const memory = objectValue(item);
        const id =
          typeof memory.memory_id === 'string' ? memory.memory_id : memory.id;
        if (typeof id !== 'string') continue;
        // Never trust search text or stale consent in the remote index.
        const allowed = await this.store.notebook().findOne({
          memoryId: id,
          approved: true,
          consented: true,
          revoked: false,
        });
        if (allowed)
          lessons.push({
            id: allowed._id,
            text: allowed.text.slice(0, 500),
            source: allowed.source,
            kind: 'approved historical interpretation',
          });
      }
      await this.store.controls.finish(operation.id, 'completed');
      return { lessons: lessons.slice(0, 2) };
    } catch (error) {
      await this.store.controls.finish(operation.id, 'unknown').catch(() => {});
      throw error;
    }
  }
  async checkFreeBudget() {
    // Dated, observed Starter Memory Lite/RAG price .0039/op. Three results
    // reserve .02, above three such operations. Requalification after a week.
    if (Date.now() > Date.parse('2026-11-07T00:00:00Z'))
      throw new LabError(
        'MEMORY_PRICE_UNVERIFIED',
        'Notebook pricing needs an operator recheck. The ritual can continue without memory.',
        503,
      );
    const balance = await this.request('billing/balance');
    if (
      balance.auto_reload_enabled !== false ||
      balance.stripe_payment_method_id ||
      Number(balance.paid_credit_usd) !== 0 ||
      Number(balance.subscription_credits_usd) !== 0 ||
      Number(balance.free_credit_usd) < 3.967132
    )
      throw new LabError(
        'MEMORY_CREDIT_CAP',
        'Notebook free-credit conditions changed. No paid fallback is enabled.',
        503,
      );
    return {
      freeUsd: Number(balance.free_credit_usd),
      autoReload: false,
      paidUsd: 0,
    };
  }
  async drainDeletions(limit = 10) {
    const pending = await this.store
      .notebook()
      .find({ revoked: true, deletion: 'pending' })
      .limit(Math.min(limit, 10))
      .toArray();
    const results = [];
    for (const note of pending) {
      try {
        if (note.memoryId)
          await this.request(
            'assistants/' +
              this.assistantId +
              '/memories/' +
              encodeURIComponent(note.memoryId),
            'DELETE',
          );
        await this.store
          .notebook()
          .updateOne(
            { _id: note._id },
            { $set: { deletion: 'confirmed', text: '' } },
          );
        results.push({ id: note._id, state: 'confirmed' });
      } catch {
        results.push({ id: note._id, state: 'pending' });
      }
    }
    return results;
  }
}
