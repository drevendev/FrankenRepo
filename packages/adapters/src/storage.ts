import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { MongoClient, type Collection } from 'mongodb';
import {
  LabError,
  type MonsterRecord,
  type InheritanceReview,
} from '@frankenrepo/core';
import { MongoControls, type Ledger } from './control';

export type SavedCardAccess = { id: string; token: string };
export interface CardStore {
  ping(): Promise<void>;
  save(
    record: MonsterRecord,
    access?: SavedCardAccess,
  ): Promise<SavedCardAccess>;
  read(id: string, token: string): Promise<MonsterRecord | null>;
  remove(id: string, token: string): Promise<boolean>;
}
type CardDocument = {
  _id: string;
  tokenHash: string;
  record?: MonsterRecord;
  savedAt: Date;
  publication?: { publicId: string; consentedAt: string };
  deletedAt?: Date;
};
const digest = (token: string) =>
  createHash('sha256').update(token).digest('hex');
export class MongoCardStore implements CardStore {
  private client: MongoClient;
  private cards: Collection<CardDocument>;
  readonly controls: MongoControls;
  constructor(uri: string, database: string) {
    if (!/^[a-zA-Z0-9_-]{1,63}$/.test(database))
      throw new LabError(
        'INVALID_STORAGE_CONFIG',
        'Choose a valid MongoDB database name.',
        500,
      );
    try {
      this.client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        socketTimeoutMS: 10000,
        waitQueueTimeoutMS: 8000,
        maxPoolSize: 5,
      });
      this.cards = this.client
        .db(database)
        .collection<CardDocument>('monster_cards');
      this.controls = new MongoControls(
        this.client.db(database).collection<Ledger>('usage_windows'),
        this.client.db(database).collection('ritual_jobs'),
      );
    } catch (error) {
      if (error instanceof LabError) throw error;
      throw new LabError(
        'INVALID_STORAGE_CONFIG',
        'MongoDB configuration is invalid; inspect the server environment.',
        500,
      );
    }
  }
  private async guarded<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof LabError) throw error;
      throw new LabError(
        'STORAGE_UNAVAILABLE',
        'The specimen archive is unavailable. Your card can still be exported; saving can be retried without generating again.',
        503,
        true,
      );
    }
  }
  async ping() {
    await this.guarded(async () => {
      await this.client.db().command({ ping: 1 });
    });
  }
  async save(
    record: MonsterRecord,
    access?: SavedCardAccess,
  ): Promise<SavedCardAccess> {
    const id = access?.id ?? randomUUID(),
      token = access?.token ?? randomBytes(32).toString('base64url');
    const stored = structuredClone(record);
    stored.publication = { state: 'private' };
    if (Buffer.byteLength(JSON.stringify(stored)) > 40_000)
      throw new LabError(
        'RECORD_TOO_LARGE',
        'The specimen exceeds the archive size limit. Local export remains available.',
        413,
      );
    await this.guarded(async () => {
      // Slots are intentionally never refunded automatically: a failed/unknown
      // write cannot permit unbounded storage through racing retries.
      await this.controls.mutate((l) => {
        if (!l.cardSlots.includes(id)) {
          if (l.cardSlots.length >= 100)
            throw new LabError(
              'ARCHIVE_FULL',
              'The bounded specimen archive is full. Export remains available.',
              503,
            );
          l.cardSlots.push(id);
        }
      });
      await this.cards.updateOne(
        { _id: id, tokenHash: digest(token) },
        {
          $setOnInsert: {
            _id: id,
            tokenHash: digest(token),
            record: stored,
            savedAt: new Date(),
          },
        },
        { upsert: true },
      );
      if (!(await this.read(id, token)))
        throw new LabError(
          'CARD_REMOVED',
          'This specimen was deleted. Its old operation cannot recreate it.',
          410,
        );
    });
    return { id, token };
  }
  async read(id: string, token: string) {
    const found = await this.guarded(() =>
      this.cards.findOne(
        { _id: id, tokenHash: digest(token), deletedAt: { $exists: false } },
        { projection: { record: 1 } },
      ),
    );
    return found?.record ?? null;
  }
  async remove(id: string, token: string) {
    const authorized = await this.read(id, token);
    if (!authorized) return false;
    // Revoke retrieval first, even if external deletion is delayed.
    await this.client
      .db(this.cards.dbName)
      .collection('notebook_manifest')
      .updateMany(
        { cardId: id },
        { $set: { revoked: true, deletion: 'pending' } },
      );
    const removed =
      (
        await this.guarded(() =>
          this.cards.updateOne(
            {
              _id: id,
              tokenHash: digest(token),
              deletedAt: { $exists: false },
            },
            {
              $set: { deletedAt: new Date() },
              $unset: { record: '', publication: '' },
            },
          ),
        )
      ).modifiedCount === 1;
    if (removed) {
      await this.controls.redactCardJobs(authorized.id);
      await this.reviews().updateMany(
        { cardId: id },
        { $unset: { review: '' }, $set: { state: 'removed' } },
      );
    }
    return removed;
  }
  async publish(id: string, token: string) {
    const publication = {
      publicId: randomUUID(),
      consentedAt: new Date().toISOString(),
    };
    const result = await this.guarded(() =>
      this.cards.findOneAndUpdate(
        { _id: id, tokenHash: digest(token), deletedAt: { $exists: false } },
        { $set: { publication } },
        { returnDocument: 'after' },
      ),
    );
    if (!result)
      throw new LabError(
        'CARD_NOT_FOUND',
        'This saved card is unavailable.',
        404,
      );
    return result.publication!;
  }
  async unpublish(id: string, token: string) {
    if (!(await this.read(id, token)))
      throw new LabError(
        'CARD_NOT_FOUND',
        'This saved card is unavailable.',
        404,
      );
    await this.client
      .db(this.cards.dbName)
      .collection('notebook_manifest')
      .updateMany(
        { cardId: id },
        { $set: { revoked: true, deletion: 'pending' } },
      );
    await this.guarded(() =>
      this.cards.updateOne(
        { _id: id, tokenHash: digest(token) },
        { $unset: { publication: '' } },
      ),
    );
  }
  async exhibit(publicId: string) {
    const found = await this.guarded(() =>
      this.cards.findOne({
        'publication.publicId': publicId,
        deletedAt: { $exists: false },
      }),
    );
    if (!found?.record) return null;
    // No capability, scope, internal job ID or review/private metadata.
    const { context, ...record } = found.record;
    delete record.workflow;
    const publicContext = context
      ? { lessons: context.lessons, research: context.research }
      : undefined;
    return {
      ...record,
      context: publicContext,
      publication: {
        state: 'published' as const,
        consentedAt: found.publication!.consentedAt,
      },
    };
  }
  async removalState(id: string, token: string) {
    const found = await this.guarded(() =>
      this.cards.findOne(
        { _id: id, tokenHash: digest(token) },
        { projection: { deletedAt: 1, publication: 1 } },
      ),
    );
    if (!found) return null;
    const memory = await this.notebook()
      .find({ cardId: id, revoked: true })
      .limit(10)
      .toArray();
    return {
      cardRemoved: !!found.deletedAt,
      published: !!found.publication,
      pending: memory.some((m) => m.deletion !== 'confirmed'),
      memories: memory.map((m) => ({ id: m._id, state: m.deletion })),
    };
  }
  notebook() {
    return this.client.db(this.cards.dbName).collection<{
      _id: string;
      cardId: string;
      memoryId: string | null;
      text: string;
      source: string;
      approved: boolean;
      consented: boolean;
      revoked: boolean;
      deletion: string;
    }>('notebook_manifest');
  }
  private reviews() {
    return this.client.db(this.cards.dbName).collection<{
      _id: string;
      cardId: string;
      state: string;
      review?: InheritanceReview;
      error?: { code: string; message: string };
      expiresAt: Date;
    }>('reviews');
  }
  async runReview(
    id: string,
    cardId: string,
    action: () => Promise<InheritanceReview>,
  ) {
    try {
      await this.reviews().createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 },
      );
      await this.reviews().insertOne({
        _id: id,
        cardId,
        state: 'running',
        expiresAt: new Date(Date.now() + 86400_000),
      });
      await this.controls.attempt(id, {
        id,
        model: 'ultramarine-1-flash',
        startedAt: new Date().toISOString(),
        outcome: 'unknown',
        inputTokens: null,
        outputTokens: null,
        costUsd: null,
      });
      const review = await action();
      await this.controls.settleAttempt(id, id, {
        outcome: 'completed',
        model: review.model,
        inputTokens: review.usage.inputTokens,
        outputTokens: review.usage.outputTokens,
        costUsd: review.cost.usd,
      });
      await this.reviews().updateOne(
        { _id: id },
        { $set: { state: 'completed', review } },
      );
      await this.controls.finish(id, 'completed');
    } catch (error) {
      const safe =
        error instanceof LabError
          ? error
          : new LabError(
              'REVIEW_UNAVAILABLE',
              'The second opinion is unavailable. Your original card remains intact.',
              503,
            );
      await this.reviews()
        .updateOne(
          { _id: id },
          {
            $set: {
              state: 'unavailable',
              error: { code: safe.code, message: safe.message },
            },
          },
        )
        .catch(() => {});
      await this.controls.finish(id, 'unknown').catch(() => {});
    }
  }
  async getReview(cardId: string, id: string) {
    const r = await this.reviews().findOne({
      _id: id,
      cardId,
      expiresAt: { $gt: new Date() },
    });
    return r
      ? {
          state:
            r.state === 'running' &&
            r.expiresAt.getTime() - 86400_000 < Date.now() - 240_000
              ? 'unavailable'
              : r.state,
          review: r.review,
          error: r.error,
        }
      : null;
  }
  async close() {
    await this.client.close();
  }
}
