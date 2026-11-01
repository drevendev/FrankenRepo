import * as Sentry from '@sentry/node';
import { LabError } from '@frankenrepo/core';
export type TraceAttributes = Record<string, string | number | boolean>;
export interface Telemetry {
  span<T>(
    name: string,
    op: string,
    attributes: TraceAttributes,
    work: () => Promise<T>,
  ): Promise<T>;
}
// Preserve safe application error codes, never forward the upstream exception.
export const labTelemetry: Telemetry = {
  async span(name, op, attributes, work) {
    return Sentry.startSpan({ name, op, attributes }, async (span) => {
      try {
        const result = await work();
        span.setStatus({ code: 1 });
        return result;
      } catch (error) {
        span.setAttribute(
          'frankenrepo.failure_code',
          error instanceof LabError ? error.code : 'UNEXPECTED_STAGE_FAILURE',
        );
        span.setStatus({ code: 2, message: 'operation_failed' });
        throw error;
      }
    });
  },
};
export function inferenceAttributes(
  model: string,
  inputTokens: number | null,
  outputTokens: number | null,
  usd: number | null,
): TraceAttributes {
  return {
    'gen_ai.operation.name': 'chat',
    'gen_ai.operation.type': 'ai_client',
    'gen_ai.request.model': model,
    'gen_ai.response.model': model,
    ...(inputTokens === null
      ? {}
      : { 'gen_ai.usage.input_tokens': inputTokens }),
    ...(outputTokens === null
      ? {}
      : { 'gen_ai.usage.output_tokens': outputTokens }),
    ...(usd === null ? {} : { 'gen_ai.usage.total_cost': usd }),
  };
}
export function currentTraceId() {
  return Sentry.getActiveSpan()?.spanContext().traceId;
}
export function annotateInference(
  model: string,
  inputTokens: number | null,
  outputTokens: number | null,
  usd: number | null,
  provider?: string,
) {
  Sentry.getActiveSpan()?.setAttributes(
    inferenceAttributes(model, inputTokens, outputTokens, usd),
  );
  if (provider)
    Sentry.getActiveSpan()?.setAttributes({
      'gen_ai.system': provider,
      'gen_ai.provider.name': provider,
    });
}
