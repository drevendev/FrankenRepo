import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { MongoCardStore } from '@frankenrepo/adapters';
const store = new MongoCardStore(
  process.env.MONGODB_URI!,
  process.env.MONGODB_DB ?? 'frankenrepo',
);
try {
  const operations = await store.controls.mutate((l) =>
    l.operations.map((o) => ({
      id: o.id,
      kind: o.kind,
      state: o.state,
      createdAt: new Date(o.created).toISOString(),
      reservedCalls: o.calls,
      reservedMaxUsd: o.maxUsd,
      attempts: o.attempts,
    })),
  );
  const access = JSON.parse(
    await readFile('.local/partner-preflight.json', 'utf8'),
  );
  const paper = access.services.paperBalance.data,
    backboard = access.services.backboardBalance.data;
  const body = {
    kind: 'LIVE_PARTNER_QUALIFICATION_ROLLUP',
    at: new Date().toISOString(),
    baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim(),
    worktreeDirty: true,
    publicDemoUrl: null,
    operations,
    cost: {
      paper: {
        initialAvailableUsd: 5,
        availableUsd: paper.available_nanodollars / 1e9,
        reservedUsd: paper.reserved_nanodollars / 1e9,
        accountBalanceDeltaUsd: 5 - paper.available_nanodollars / 1e9,
        requests: paper.requests,
        promptTokens: paper.prompt_tokens,
        completionTokens: paper.completion_tokens,
        basis:
          'Account-wide observed balance delta since this task preflight; no other account activity is established.',
      },
      backboard: {
        freeBeforeUsd: 4.967132,
        freeAfterUsd: backboard.free_credit_usd,
        mutatingCallsRun: false,
        autoReload: backboard.auto_reload_enabled,
        hasCard: !!backboard.stripe_payment_method_id,
      },
      tinker: {
        trainingRun: false,
        samplingRun: false,
        modelCalls: 0,
        ownPaymentsUsd: 0,
      },
      cloudflare: {
        reservedCalls: operations
          .filter((o) => o.kind === 'gemma')
          .reduce((s, o) => s + o.reservedCalls, 0),
        attempts: operations
          .filter((o) => o.kind === 'gemma')
          .flatMap((o) => o.attempts).length,
        billedUsd: null,
        neurons: null,
        reason:
          'Provider usage/billing dashboard not captured; unknown is not zero.',
      },
      ownPaymentsUsd: 0,
    },
    deferredByOwner: [
      'human label review and Tinker training',
      'public notebook corpus approval and Backboard lifecycle',
      'source push / public Render deployment prerequisites',
      'operator category/quality approval',
      'public Browserbase E2E',
      'article publication, release and push',
    ],
  };
  await writeFile(
    'docs/eval/PARTNER_QUALIFICATION_ROLLUP.json',
    JSON.stringify(body, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      cost: body.cost,
      gemmaOperations: operations.filter((o) => o.kind === 'gemma').length,
      modelCallsWereLive: true,
    }),
  );
} finally {
  await store.close();
}
