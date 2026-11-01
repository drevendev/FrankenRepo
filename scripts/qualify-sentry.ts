import '../apps/api/src/instrument';
import * as Sentry from '@sentry/node';
import { writeFile } from 'node:fs/promises';
const receipt: Record<string, unknown> = {
  kind: 'LIVE_SENTRY_CONTROLLED_DIAGNOSTIC',
  at: new Date().toISOString(),
  syntheticFailure: true,
  privateContentCaptured: false,
  modelCalled: false,
  status: 'not-confirmed',
};
await Sentry.startSpan(
  {
    name: 'FrankenRepo controlled optional failure',
    op: 'gen_ai.invoke_agent',
    attributes: {
      'gen_ai.operation.name': 'invoke_agent',
      'gen_ai.agent.name': 'FrankenRepo',
      'frankenrepo.controlled_diagnostic': true,
    },
  },
  async (span) => {
    receipt.traceId = span.spanContext().traceId;
    await Sentry.startSpan(
      {
        name: 'controlled notebook timeout',
        op: 'gen_ai.execute_tool',
        attributes: {
          'gen_ai.operation.name': 'execute_tool',
          'gen_ai.tool.name': 'approved-notebook',
          'frankenrepo.failure_reason': 'controlled_timeout',
          'frankenrepo.fallback': 'continue_without_memory',
        },
      },
      async (tool) => {
        tool.setStatus({ code: 2, message: 'controlled_timeout' });
      },
    );
    receipt.eventId = Sentry.captureMessage(
      'FrankenRepo controlled optional timeout',
      'warning',
    );
    span.setStatus({ code: 1 });
  },
);
receipt.flushed = await Sentry.flush(10000);
receipt.status = receipt.flushed
  ? 'sent-pending-console-verification'
  : 'not-confirmed';
receipt.consoleUrl =
  'https://dreven.sentry.io/explore/traces/trace/' + receipt.traceId + '/';
await writeFile(
  'docs/eval/SENTRY_CONTROLLED_FAILURE.json',
  JSON.stringify(receipt, null, 2) + '\n',
);
console.log(JSON.stringify(receipt));
