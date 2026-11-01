import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import type {
  DonorGenome,
  MonsterDraft,
  RitualContext,
} from '@frankenrepo/core';
import { LabError } from '@frankenrepo/core';
import type { InferenceResult } from '@frankenrepo/adapters';
export type WorkflowData = {
  runId: string;
  genomes?: [DonorGenome, DonorGenome];
  context?: RitualContext;
  inference?: InferenceResult;
  draft?: MonsterDraft;
};
export async function executeMastra(
  runId: string,
  actions: {
    name: string;
    execute: (data: WorkflowData) => Promise<WorkflowData>;
  }[],
  signal: AbortSignal,
) {
  const schema = z.custom<WorkflowData>(
    (v) => typeof v === 'object' && v !== null && 'runId' in v,
  );
  let failure: unknown;
  const steps = actions.map((action) =>
    createStep({
      id: action.name,
      inputSchema: schema,
      outputSchema: schema,
      retries: 0,
      execute: async ({ inputData }) => {
        signal.throwIfAborted();
        try {
          return await action.execute(inputData);
        } catch (error) {
          failure = error;
          throw error;
        }
      },
    }),
  );
  let workflow = createWorkflow({
    id: 'frankenrepo-ritual-v2',
    inputSchema: schema,
    outputSchema: schema,
    options: { validateInputs: true },
  }).then(steps[0]);
  for (const step of steps.slice(1)) workflow = workflow.then(step);
  const committed = workflow.commit();
  const run = await committed.createRun({ runId });
  const abort = () => {
    void run.cancel().catch(() => {});
  };
  signal.addEventListener('abort', abort, { once: true });
  try {
    const result = await run.start({ inputData: { runId } });
    signal.throwIfAborted();
    if (result.status !== 'success')
      throw failure instanceof LabError
        ? failure
        : new LabError(
            'WORKFLOW_FAILED',
            'The ritual workflow could not complete.',
            503,
          );
    return result.result;
  } finally {
    signal.removeEventListener('abort', abort);
  }
}
