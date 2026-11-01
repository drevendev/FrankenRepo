import { describe, expect, it, vi } from 'vitest';
import { UltramarineReviewer } from '@frankenrepo/adapters';
import { testMonster } from './fixtures';
const review = {
  parentA: 'A maps source-linked ideas.',
  parentB: 'B renders editable drawings.',
  jointMechanism: 'Map a source-linked idea to an editable diagram.',
  unsupportedClaims: [],
  proposedMutation:
    'A proposed adapter would map an idea record to an editable diagram.',
  limitation: 'The adapter remains unbuilt.',
  evidenceIds: ['A:description', 'B:description'],
};
const pricing = { uncached_input_usd: '.15', output_usd: '.50' };
const upstream = (content: unknown, reason = 'stop') => ({
  id: 'test-only',
  object: 'chat.completion',
  created: 0,
  model: 'ultramarine-1-flash',
  choices: [
    {
      index: 0,
      finish_reason: reason,
      message: { role: 'assistant', content: JSON.stringify(content) },
    },
  ],
  usage: { prompt_tokens: 123, completion_tokens: 45, total_tokens: 168 },
});
describe('optional reviewer contract — MOCK evidence only', () => {
  it('uses the official fixed origin with no tools, retries or card replacement', async () => {
    const original = testMonster();
    const before = structuredClone(original);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(pricing))
      .mockResolvedValueOnce(Response.json(upstream(review)));
    const usage = vi.fn(async () => {});
    const result = await new UltramarineReviewer(
      'test-only-key',
      usage,
      fetcher,
    ).review(original);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1][0]).toBe(
      'https://api.paperinstruments.com/v1/chat/completions',
    );
    const body = JSON.parse(fetcher.mock.calls[1][1]!.body as string);
    expect(body.tools).toBeUndefined();
    expect(body.max_completion_tokens).toBe(1000);
    expect(result.usage).toEqual({ inputTokens: 123, outputTokens: 45 });
    expect(result.cost.basis).toBe('estimated');
    expect(original).toEqual(before);
  });
  it.each([
    ['length', review, 'REVIEW_OUTPUT_LIMIT'],
    [
      'stop',
      { ...review, evidenceIds: ['A:invented', 'B:description'] },
      'REVIEW_INVALID_EVIDENCE',
    ],
    ['stop', { ...review, parentA: 7 }, 'REVIEW_INVALID'],
  ])(
    'records known usage for rejected %s output without another call',
    async (reason, value, code) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(Response.json(pricing))
        .mockResolvedValueOnce(
          Response.json(upstream(value, reason as string)),
        );
      const usage = vi.fn(async () => {});
      await expect(
        new UltramarineReviewer('test-only-key', usage, fetcher).review(
          testMonster(),
        ),
      ).rejects.toMatchObject({ code });
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(usage).toHaveBeenCalledOnce();
    },
  );
  it.each([401, 429, 503])(
    'does not retry status %s or expose upstream text',
    async (status) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(Response.json(pricing))
        .mockResolvedValueOnce(
          Response.json(
            { error: { message: 'SECRET-UPSTREAM-URL' } },
            { status },
          ),
        );
      await expect(
        new UltramarineReviewer('test-only-key', undefined, fetcher).review(
          testMonster(),
        ),
      ).rejects.toMatchObject({ code: 'REVIEW_UNAVAILABLE' });
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );
  it('fails closed when the price changes, before inference', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ ...pricing, output_usd: '99' }));
    await expect(
      new UltramarineReviewer('test-only-key', undefined, fetcher).review(
        testMonster(),
      ),
    ).rejects.toMatchObject({ code: 'REVIEW_PRICING_UNVERIFIED' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
