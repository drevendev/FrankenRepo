import { describe, it, expect } from 'vitest';
import {
  normalizeRepo,
  donorPair,
  monsterDraftSchema,
  validateDraft,
  spriteRecipe,
  monsterSvg,
  certificateSvg,
  MODE_PRESETS,
} from '@frankenrepo/core';
import { TEST_DRAFT, TEST_DONORS, testMonster } from './fixtures';
describe('public repository boundary', () => {
  it.each(['owner/repo', 'https://github.com/owner/repo', 'owner/repo/'])(
    'normalizes %s',
    (input) => expect(normalizeRepo(input)).toBe('owner/repo'),
  );
  it.each([
    'http://github.com/a/b',
    'https://github.com:443/a/b',
    'https://github.com@evil.test/a/b',
    'https://evil.test/a/b',
    'https://127.0.0.1/a/b',
    'a/b/tree/main',
    'a/..',
    'a/b#readme',
    'a/b?x=y',
    'https://github.com/a/b%2f..',
    'a/b\\..',
    'a--b/repo',
    'file:///a/b',
    'https://github.com./a/b',
    'https://github.com/a/b/extra',
    'a/b@main',
  ])('rejects %s before any network call', (input) =>
    expect(() => normalizeRepo(input)).toThrow(),
  );
  it('rejects identical donors irrespective of case', () =>
    expect(donorPair.safeParse(['Owner/repo', 'owner/REPO']).success).toBe(
      false,
    ));
});
describe('fiction and fixed evidence', () => {
  it('rejects unknown source IDs, wrong parent roles and additional fields', () => {
    expect(validateDraft(TEST_DRAFT, TEST_DONORS)).toEqual(TEST_DRAFT);
    expect(() =>
      validateDraft(
        {
          ...TEST_DRAFT,
          brain: {
            text: 'An imaginative tiny brain',
            evidenceIds: ['A:invented'],
          },
        },
        TEST_DONORS,
      ),
    ).toThrow();
    expect(() =>
      validateDraft(
        {
          ...TEST_DRAFT,
          body: {
            text: 'An imaginative tiny body',
            evidenceIds: ['A:description'],
          },
        },
        TEST_DONORS,
      ),
    ).toThrow();
    expect(
      monsterDraftSchema.safeParse({
        ...TEST_DRAFT,
        sourceUrl: 'https://evil.test',
      }).success,
    ).toBe(false);
  });
  it.each([
    'It has 900 stars',
    '<script>alert(1)</script>',
    'This repo is dead',
    'Visit https://evil.test',
  ])('rejects unsupported prose %s', (hook) =>
    expect(() => validateDraft({ ...TEST_DRAFT, hook }, TEST_DONORS)).toThrow(),
  );
  it('cannot cite an unknown observation', () =>
    expect(() =>
      validateDraft(TEST_DRAFT, [
        {
          ...TEST_DONORS[0],
          evidence: TEST_DONORS[0].evidence.map((e) => ({
            ...e,
            status: 'unknown',
          })),
        },
        TEST_DONORS[1],
      ]),
    ).toThrow());
  it('has distinct mode instructions', () =>
    expect(new Set(Object.values(MODE_PRESETS)).size).toBe(3));
});
describe('deterministic original artwork and safe export', () => {
  it('repeats the same recipe and covers all component variants', () => {
    expect(spriteRecipe('same')).toEqual(spriteRecipe('same'));
    const recipes = Array.from({ length: 1000 }, (_, i) =>
      spriteRecipe('seed-' + i),
    );
    for (const [field, count] of [
      ['body', 6],
      ['head', 6],
      ['accessory', 5],
      ['palette', 6],
      ['expression', 4],
    ] as const)
      expect(new Set(recipes.map((r) => r[field])).size).toBe(count);
    expect(monsterSvg(spriteRecipe('same'))).not.toMatch(
      /https?:\/\/(?!www.w3.org)/,
    );
  });
  it('escapes model text in standalone SVG and includes both source URLs', () => {
    const monster = testMonster();
    monster.draft.name = '<script>&bad';
    const svg = certificateSvg(monster);
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;&amp;bad');
    expect(svg).toContain('https://github.com/test/brain');
    expect(svg).toContain('TEST FIXTURE');
  });
});
