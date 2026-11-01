import { createHash, randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import { annotateInference, currentTraceId } from '@frankenrepo/adapters';
import {
  LabError,
  PROMPT_VERSION,
  spriteRecipe,
  validateDraft,
  type DonorGenome,
  type MonsterRecord,
  type RitualJob,
  type RitualMode,
  type RitualContext,
} from '@frankenrepo/core';
import type {
  InferencePort,
  CardStore,
  SavedCardAccess,
  MongoControls,
  Operation,
  Telemetry,
} from '@frankenrepo/adapters';
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
  saved?: Promise<SavedCardAccess>;
  operation?: Operation;
  context?: RitualContext;
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
      store?: CardStore;
      controls?: MongoControls;
      dailyCalls?: number;
      maxUsdPerCall?: number;
      orchestrator?: 'legacy' | 'mastra';
      telemetry?: Telemetry;
      memory?: (genomes: [DonorGenome, DonorGenome]) => Promise<RitualContext>;
      research?: (
        genomes: [DonorGenome, DonorGenome],
      ) => Promise<NonNullable<RitualContext['research']>>;
    } = {},
  ) {}
  async startDurable(
    scope: string,
    key: string,
    donors: [string, string],
    mode: RitualMode,
    context?: RitualContext,
  ) {
    if (!this.options.controls) return this.start(scope, key, donors, mode);
    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify({
          donors: donors.map((d) => d.toLowerCase()),
          mode,
          ...(context ? { context } : {}),
        }),
      )
      .digest('hex');
    const { operation, fresh } = await this.options.controls.reserve({
      scope,
      key,
      fingerprint,
      kind: 'gemma',
      calls: context?.revision ? 1 : 2,
      maxUsd:
        (context?.revision ? 1 : 2) * (this.options.maxUsdPerCall ?? 0.005),
      dailyCalls: this.options.dailyCalls ?? 20,
      maxParallel: this.options.maxParallel ?? 1,
      revisionOf: context?.revision?.originalOperationId,
    });
    if (!fresh) {
      const found = await this.getPersisted(operation.id, scope);
      if (found) return found;
      return {
        ritualId: operation.id,
        state: 'failed' as const,
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(operation.created + 86400_000).toISOString(),
        error: {
          code: 'INTERRUPTED_UNKNOWN',
          message:
            'The operation was reserved before a worker interruption. It will not call the model again.',
          retryable: false,
        },
      };
    }
    try {
      return this.start(scope, key, donors, mode, operation, context);
    } catch (e) {
      await this.options.controls.finish(operation.id, 'failed');
      throw e;
    }
  }
  async getPersisted(id: string, scope: string) {
    try {
      return this.get(id, scope);
    } catch {
      return this.options.controls?.getJob(id, scope) ?? null;
    }
  }
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
    operation?: Operation,
    context?: RitualContext,
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
    const id = operation?.id ?? randomUUID();
    const time = this.now();
    const expires =
      time + (this.options.ttlMs ?? (operation ? 86400_000 : 900_000));
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
      operation,
      context,
    };
    this.entries.set(id, entry);
    this.keys.set(entry.key, id);
    this.active++;
    void this.execute(entry, donors, mode)
      .catch(() => {})
      .finally(() => this.active--);
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
  async save(id: string, scope: string): Promise<SavedCardAccess> {
    const job = this.get(id, scope);
    if (!this.options.store)
      throw new LabError(
        'STORAGE_DISABLED',
        'Permanent storage is not configured.',
        503,
      );
    if (job.state !== 'completed' || !job.monster)
      throw new LabError(
        'CARD_NOT_READY',
        'Complete the ritual before saving its card.',
        409,
      );
    const entry = this.entries.get(id)!;
    if (!entry.saved) {
      entry.saved = this.options.store.save(job.monster).catch((error) => {
        entry.saved = undefined;
        throw error;
      });
    }
    return entry.saved;
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
  forgetCard(cardId: string) {
    for (const entry of this.entries.values())
      if (entry.job.monster?.id === cardId) {
        delete entry.job.monster;
        entry.job.state = 'failed';
        entry.job.error = {
          code: 'CARD_REMOVED',
          message: 'This specimen was deleted.',
          retryable: false,
        };
      }
  }
  private async execute(
    entry: Entry,
    refs: [string, string],
    mode: RitualMode,
  ) {
    const { job, controller } = entry;
    const update = async (state: RitualJob['state']) => {
      controller.signal.throwIfAborted();
      job.state = state;
      job.updatedAt = new Date(this.now()).toISOString();
      await this.options.controls?.putJob(entry.scope, job);
    };
    // Yield once so POST reports queued and clients observe actual work.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    try {
      const steps: NonNullable<MonsterRecord['workflow']>['steps'] = [];
      const trace =
        this.options.telemetry?.span.bind(this.options.telemetry) ??
        (async <T>(
          _name: string,
          _op: string,
          _attrs: Record<string, string | number | boolean>,
          work: () => Promise<T>,
        ) => work());
      const actions: {
        name: string;
        execute: (
          data: import('./workflow').WorkflowData,
        ) => Promise<import('./workflow').WorkflowData>;
      }[] = [
        {
          name: 'inspect-donors',
          execute: async (data) => {
            await update('inspecting');
            const genomes =
              entry.context?.revision?.parents ??
              ((await Promise.all([
                this.github.inspect(refs[0], 'A', controller.signal),
                this.github.inspect(refs[1], 'B', controller.signal),
              ])) as [DonorGenome, DonorGenome]);
            return { ...data, genomes };
          },
        },
        {
          name: 'approved-context',
          execute: async (data) => {
            let context = entry.context ?? {};
            if (this.options.research) {
              try {
                context = {
                  ...context,
                  research: await this.options.research(data.genomes!),
                };
              } catch {
                steps.push({
                  name: 'browser-research',
                  state: 'unavailable',
                  durationMs: 0,
                });
              }
            }
            if (this.options.memory) {
              try {
                const memory = await this.options.memory(data.genomes!);
                context = { ...memory, ...context };
              } catch {
                steps.push({
                  name: 'memory',
                  state: 'unavailable',
                  durationMs: 0,
                });
              }
            }
            return { ...data, context };
          },
        },
        {
          name: 'gemma-and-contract',
          execute: async (data) => {
            const genomes = data.genomes!;
            const seed = job.ritualId;
            let draft;
            let inference;
            for (
              let attempt = 0;
              attempt < (entry.context?.revision ? 1 : 2);
              attempt++
            ) {
              if (attempt === 0) await update('splicing');
              const attemptId = randomUUID();
              try {
                await this.options.controls?.attempt(job.ritualId, {
                  id: attemptId,
                  model: 'configured-gemma',
                  startedAt: new Date().toISOString(),
                  outcome: 'unknown',
                  inputTokens: null,
                  outputTokens: null,
                  costUsd: null,
                });
                inference = await trace(
                  'chat Gemma',
                  'gen_ai.request',
                  {
                    'gen_ai.operation.name': 'chat',
                    'gen_ai.system': 'configured-gemma',
                    'frankenrepo.repair': attempt > 0,
                  },
                  async () => {
                    const generated = await this.model.generate(
                      genomes,
                      mode,
                      seed,
                      attempt > 0,
                      controller.signal,
                      data.context,
                    );
                    annotateInference(
                      generated.model,
                      generated.usage?.inputTokens ?? null,
                      generated.usage?.outputTokens ?? null,
                      null,
                      generated.provider,
                    );
                    return generated;
                  },
                );
                await this.options.controls?.settleAttempt(
                  job.ritualId,
                  attemptId,
                  {
                    model: inference.model,
                    outcome: 'completed',
                    inputTokens: inference.usage?.inputTokens ?? null,
                    outputTokens: inference.usage?.outputTokens ?? null,
                  },
                );
                await update('validating');
                draft = validateDraft(inference.value, genomes);
                break;
              } catch (err) {
                if (controller.signal.aborted) throw err;
                // One repair only for invalid JSON/schema/evidence; quota/transport never silently repeats.
                if (
                  attempt ||
                  !(
                    err instanceof ZodError ||
                    (err instanceof LabError &&
                      [
                        'INVALID_EVIDENCE',
                        'UNSAFE_DRAFT',
                        'INVALID_UPSTREAM',
                        'INVALID_MODEL_JSON',
                      ].includes(err.code))
                  ) ||
                  entry.context?.revision
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
            return { ...data, draft, inference };
          },
        },
        {
          name: 'reveal',
          execute: async (data) => {
            controller.signal.throwIfAborted();
            return data;
          },
        },
      ];
      const wrapped = actions.map((action) => ({
        ...action,
        execute: async (data: import('./workflow').WorkflowData) => {
          const start = this.now();
          const result = await trace(
            action.name,
            'gen_ai.execute_tool',
            {
              'gen_ai.operation.name': 'execute_tool',
              'gen_ai.tool.name': action.name,
            },
            async () => {
              try {
                return await action.execute(data);
              } catch (error) {
                if (error instanceof LabError) throw error;
                if (error instanceof ZodError)
                  throw new LabError(
                    'INVALID_MODEL_JSON',
                    'Gemma did not meet the bounded JSON contract after its final attempt.',
                    502,
                    true,
                  );
                throw new LabError(
                  'WORKFLOW_STAGE_FAILED',
                  'A workflow stage could not complete. No uncertain provider call will be repeated.',
                  503,
                );
              }
            },
          );
          steps.push({
            name: action.name,
            state: 'completed',
            durationMs: this.now() - start,
          });
          return result;
        },
      }));
      let traceId: string | undefined;
      const result = await trace(
        'FrankenRepo ritual',
        'gen_ai.invoke_agent',
        {
          'gen_ai.operation.name': 'invoke_agent',
          'gen_ai.agent.name': 'FrankenRepo',
          'frankenrepo.ritual_id': job.ritualId,
        },
        async () => {
          traceId = currentTraceId();
          job.traceId = traceId;
          if (this.options.orchestrator === 'mastra') {
            const { executeMastra } = await import('./workflow');
            return executeMastra(job.ritualId, wrapped, controller.signal);
          }
          let data: import('./workflow').WorkflowData = { runId: job.ritualId };
          for (const action of wrapped) data = await action.execute(data);
          return data;
        },
      );
      const { draft, inference, genomes } = result;
      if (!draft || !inference || !genomes)
        throw new Error('INCOMPLETE_WORKFLOW');
      const seed = job.ritualId;
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
        context: result.context,
        ...(entry.context?.revision
          ? {
              revision: {
                originalCardId: entry.context.revision.originalCardId,
                originalContentHash: entry.context.revision.originalContentHash,
                reviewId: entry.context.revision.reviewId,
                number: 1,
              },
            }
          : {}),
        workflow: {
          engine: this.options.orchestrator ?? 'legacy',
          runId: job.ritualId,
          traceId,
          steps,
        },
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
      await update('completed');
      await this.options.controls?.finish(job.ritualId, 'completed');
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
      await this.options.controls?.putJob(entry.scope, job);
      await this.options.controls?.finish(job.ritualId, 'unknown');
    }
  }
}
