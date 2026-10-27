import { LabError } from '@frankenrepo/core';
export type Fetcher = typeof fetch;
export async function boundedRequest(
  fetcher: Fetcher,
  url: string,
  init: RequestInit,
  options: { timeoutMs?: number; maxBytes?: number; signal?: AbortSignal } = {},
): Promise<{ response: Response; text: string }> {
  const signal = AbortSignal.any([
    AbortSignal.timeout(options.timeoutMs ?? 8000),
    ...(options.signal ? [options.signal] : []),
  ]);
  try {
    const response = await fetcher(url, { ...init, redirect: 'error', signal });
    const maximum = options.maxBytes ?? 100_000;
    if (Number(response.headers.get('content-length')) > maximum) {
      await response.body?.cancel();
      throw new LabError(
        'SOURCE_TOO_LARGE',
        'The source exceeded the safe response limit.',
        502,
        true,
      );
    }
    const reader = response.body?.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      try {
        while (true) {
          signal.throwIfAborted();
          const item = await reader.read();
          if (item.done) break;
          size += item.value.byteLength;
          if (size > maximum) {
            await reader.cancel();
            throw new LabError(
              'SOURCE_TOO_LARGE',
              'The source exceeded the safe response limit.',
              502,
              true,
            );
          }
          chunks.push(item.value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    const all = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      all.set(chunk, offset);
      offset += chunk.length;
    }
    return { response, text: new TextDecoder().decode(all) };
  } catch (err) {
    if (options.signal?.aborted)
      throw new LabError('CANCELLED', 'The ritual was cancelled.', 409);
    if (err instanceof LabError) throw err;
    if (signal.aborted)
      throw new LabError(
        'UPSTREAM_TIMEOUT',
        'The source took too long to respond. Your inputs are preserved.',
        504,
        true,
      );
    throw new LabError(
      'UPSTREAM_UNAVAILABLE',
      'The source is temporarily unavailable.',
      503,
      true,
    );
  }
}
export function jsonValue(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new LabError(
      'INVALID_UPSTREAM',
      'The source returned an invalid response.',
      502,
      true,
    );
  }
}
export function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new LabError(
      'INVALID_UPSTREAM',
      'The source returned an invalid object.',
      502,
      true,
    );
  return value as Record<string, unknown>;
}
// Control characters are deliberately removed before text is rendered or passed to a model.
export const cleanText = (s: string, max: number) =>
  s
    .replace(/<[^>]*>/g, '')
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
