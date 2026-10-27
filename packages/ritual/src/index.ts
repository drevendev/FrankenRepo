import { createHash, randomUUID } from 'node:crypto';
import {
  LabError,
  PROMPT_VERSION,
  spriteRecipe,
  validateDraft,
  type DonorGenome,
  type MonsterRecord,
  type RitualJob,
  type RitualMode,
} from '@frankenrepo/core';
import type { InferencePort } from '@frankenrepo/adapters';
export interface DonorPort {
  inspect(
    ref: string,
    slot: 'A' | 'B',
    signal?: AbortSignal,
  ): Promise<DonorGenome>;
}
type Entry = {
  job: RitualJob;
  scope: string;
  key: string;
  fingerprint: string;
  controller: AbortController;
  expires: number;
};
export class RitualRunner {
  private entries = new Map<string, Entry>();
  private keys = new Map<string, string>();
  private active = 0;
  constructor(
    private github: DonorPort,
    private model: InferencePort,
    private options: {
      maxParallel?: number;
      now?: () => number;
      ttlMs?: number;
      maxJobs?: number;
    } = {},
  ) {}
  private now() {
    return this.options.now?.() ?? Date.now();
  }
  sweep() {
    for (const [id, entry] of this.entries)
      if (entry.expires <= this.now()) {
        entry.controller.abort();
        this.entries.delete(id);
        this.keys.delete(entry.key);
      }
  }
  lookup(scope: string, key: string, fingerprint: string): RitualJob | null {
    this.sweep();
    const id = this.keys.get(scope + ':' + key);
    const entry = id ? this.entries.get(id) : undefined;
    if (!entry) return null;
    if (entry.fingerprint !== fingerprint)
      throw new LabError(
        'IDEMPOTENCY_CONFLICT',
        'This request ID was already used for different inputs. Start a new ritual.',
        409,
      );
    return entry.job;
  }
  start(
    scope: string,
    key: string,
    donors: [string, string],
    mode: RitualMode,
  ): RitualJob {
    const fingerprint = JSON.stringify({
      donors: donors.map((d) => d.toLowerCase()),
      mode,
    });
    const existing = this.lookup(scope, key, fingerprint);
    if (existing) return existing;
    if (this.model.capability() === 'disabled')
      throw new LabError(
        'MODEL_DISABLED',
        'Live Gemma is not configured. The lab can inspect public donors; no recorded model result is available yet.',
        503,
      );
    if (this.active >= (this.options.maxParallel ?? 1))
      throw new LabError(
        'LAB_BUSY',
        'The reanimation table is occupied. Try again when the current ritual finishes.',
        429,
        true,
      );
    if (this.entries.size >= (this.options.maxJobs ?? 100))
      throw new LabError(
        'LAB_CAPACITY',
        'The ephemeral lab is full. Try again after older jobs expire.',
        503,
        true,
      );
    const id = randomUUID();
    const time = this.now();
    const expires = time + (this.options.ttlMs ?? 900_000);
    const job: RitualJob = {
      ritualId: id,
      state: 'queued',
      updatedAt: new Date(time).toISOString(),
      expiresAt: new Date(expires).toISOString(),
    };
    const entry: Entry = {
      job,
      scope,
      key: scope + ':' + key,
      fingerprint,
      controller: new AbortController(),
      expires,
    };
    this.entries.set(id, entry);
    this.keys.set(entry.key, id);
    this.active++;
    void this.execute(entry, donors, mode).finally(() => this.active--);
    return job;
  }
  get(id: string, scope: string): RitualJob {
    this.sweep();
    const entry = this.entries.get(id);
    if (!entry || entry.scope !== scope)
      throw new LabError(
        'JOB_NOT_FOUND',
        'This ritual is unavailable or has expired.',
        404,
      );
    return entry.job;
  }
  cancel(id: string, scope: string): RitualJob {
    const job = this.get(id, scope);
    if (!['completed', 'failed', 'cancelled'].includes(job.state)) {
      this.entries.get(id)!.controller.abort();
      job.state = 'cancelled';
      job.updatedAt = new Date(this.now()).toISOString();
    }
    return job;
  }
  private async execute(
    entry: Entry,
    refs: [string, string],
    mode: RitualMode,
  ) {
    const { job, controller } = entry;
    const update = (state: RitualJob['state']) => {
      controller.signal.throwIfAborted();
      job.state = state;
      job.updatedAt = new Date(this.now()).toISOString();
    };
    // Yield once so POST reports queued and clients observe actual work.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    try {
      update('inspecting');
      const genomes = (await Promise.all([
        this.github.inspect(refs[0], 'A', controller.signal),
        this.github.inspect(refs[1], 'B', controller.signal),
      ])) as [DonorGenome, DonorGenome];
      const seed = job.ritualId;
      let draft;
      let inference;
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt === 0) update('splicing');
        try {
          inference = await this.model.generate(
            genomes,
            mode,
            seed,
            attempt > 0,
            controller.signal,
          );
          update('validating');
          draft = validateDraft(inference.value, genomes);
          break;
        } catch (err) {
          if (controller.signal.aborted) throw err;
          // One repair only for invalid JSON/schema/evidence; quota/transport never silently repeats.
          if (
            attempt ||
            (err instanceof LabError &&
              ![
                'INVALID_EVIDENCE',
                'UNSAFE_DRAFT',
                'INVALID_UPSTREAM',
                'INVALID_MODEL_JSON',
              ].includes(err.code))
          )
            throw err;
        }
      }
      if (!draft || !inference)
        throw new LabError(
          'INVALID_MODEL_JSON',
          'Gemma could not produce a valid creature after one repair.',
          502,
          true,
        );
      controller.signal.throwIfAborted();
      const monster: MonsterRecord = {
        schemaVersion: 'frankenrepo/monster/v1',
        id: randomUUID(),
        createdAt: new Date(this.now()).toISOString(),
        mode,
        model: {
          provider: inference.provider,
          id: inference.model,
          promptVersion: PROMPT_VERSION,
          ...(inference.digest ? { digest: inference.digest } : {}),
        },
        parents: genomes,
        evidence: genomes.flatMap((g) => g.evidence),
        draft,
        sprite: spriteRecipe(seed),
        publication: { state: 'ephemeral' },
        lineage: { parentMonsterIds: [], depth: 0 },
        contentHash: createHash('sha256')
          .update(
            JSON.stringify({
              draft,
              genomes,
              seed,
              mode,
              model: inference.model,
            }),
          )
          .digest('hex'),
      };
      job.monster = monster;
      update('completed');
    } catch (err) {
      if (controller.signal.aborted) {
        job.state = 'cancelled';
      } else {
        job.state = 'failed';
        const safe =
          err instanceof LabError
            ? err
            : new LabError(
                'RITUAL_FAILED',
                'The creature could not be validated. Your inputs are preserved; try a new ritual.',
                502,
                true,
              );
        job.error = {
          code: safe.code,
          message: safe.message,
          retryable: safe.retryable,
        };
      }
      job.updatedAt = new Date(this.now()).toISOString();
    }
  }
}
