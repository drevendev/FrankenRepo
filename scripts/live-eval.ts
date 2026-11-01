import { writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import {
  GitHubAdapter,
  InferenceAdapter,
  MongoCardStore,
} from '@frankenrepo/adapters';
import { RitualRunner } from '@frankenrepo/ritual';
import { donorPair, modeSchema } from '@frankenrepo/core';
import { readConfig } from '../apps/api/src/config';
const config = readConfig();
if (config.MODEL_PROVIDER === 'disabled') {
  console.error(
    'BLOCKED: MODEL_PROVIDER=disabled. No model call was made. Configure an explicitly authorized Gemma provider, then rerun.',
  );
  process.exit(2);
}
const donors = donorPair.parse(process.argv.slice(2, 4));
const mode = modeSchema.parse(process.argv[4] ?? 'cursed');
const inference = new InferenceAdapter(config.model);
const installed = await inference.installedModel();
if (config.MODEL_PROVIDER === 'ollama' && !installed)
  throw new Error(
    'The explicitly selected Gemma model is not installed. No weights will be downloaded automatically.',
  );
const store = new MongoCardStore(config.MONGODB_URI!, config.MONGODB_DB);
const runner = new RitualRunner(
  new GitHubAdapter({ token: config.GITHUB_READ_TOKEN }),
  inference,
  {
    store,
    controls: store.controls,
    dailyCalls: config.MODEL_CALLS_PER_DAY,
    maxUsdPerCall: config.MODEL_PROVIDER === 'cloudflare' ? 0.005 : 0,
    orchestrator: config.ORCHESTRATOR,
  },
);
const startedAt = new Date().toISOString();
const start = performance.now();
const job = await runner.startDurable(
  'operator-local-eval',
  randomUUID(),
  donors,
  mode,
);
let latest = job;
const deadline = Date.now() + 245_000;
while (
  !['completed', 'failed', 'cancelled'].includes(latest.state) &&
  Date.now() < deadline
) {
  await new Promise((r) => setTimeout(r, 250));
  latest = runner.get(job.ritualId, 'operator-local-eval');
}
if (!['completed', 'failed', 'cancelled'].includes(latest.state))
  latest = runner.cancel(job.ritualId, 'operator-local-eval');
const endedAt = new Date().toISOString();
await mkdir('docs/eval/runs', { recursive: true });
const path =
  'docs/eval/runs/' + startedAt.replace(/[:.]/g, '-') + '-' + mode + '.json';
const receipt = {
  kind: 'LIVE_MODEL_ATTEMPT',
  startedAt,
  endedAt,
  latencyMs: Math.round(performance.now() - start),
  provider: config.MODEL_PROVIDER,
  model:
    config.MODEL_PROVIDER === 'ollama'
      ? config.OLLAMA_MODEL
      : config.CF_GEMMA_MODEL,
  installedModel: installed,
  inputs: donors,
  mode,
  state: latest.state,
  error: latest.error ?? null,
  record: latest.monster ?? null,
  conditions: {
    maxTokens: 1000,
    maxAttempts: 2,
    temperature: 0.8,
    recording: false,
  },
};
await writeFile(path, JSON.stringify(receipt, null, 2) + '\n');
console.log(latest.state + ' · ' + path);
await store.close();
if (latest.state !== 'completed') process.exitCode = 1;
