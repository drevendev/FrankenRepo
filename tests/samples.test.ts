import { describe, it, expect } from 'vitest';
import { SAMPLE_REPOS, randomDonors } from '../apps/web/src/samples';
import { donorPair } from '@frankenrepo/core';
describe('curated sample selection', () => {
  it('contains the requested public donors and only unique valid references', () => {
    for (const ref of [
      'drevendev/HungryCrab',
      'drevendev/Scriptorium',
      'drevendev/Playmancer',
      'drevendev/Dayflare',
      'DenisSergeevitch/ex-ussr-kinship-research',
      'DenisSergeevitch/desktop-fly',
    ])
      expect(SAMPLE_REPOS.some((repo) => repo.ref === ref)).toBe(true);
    expect(
      new Set(SAMPLE_REPOS.map((repo) => repo.ref.toLowerCase())).size,
    ).toBe(SAMPLE_REPOS.length);
  });
  it('never chooses the same donor twice or repeats the last unordered pair', () => {
    let previous = randomDonors(undefined, () => 0);
    for (let n = 0; n < 100; n++) {
      const next = randomDonors(previous, () => 0);
      expect(donorPair.safeParse(next).success).toBe(true);
      expect([...next].sort()).not.toEqual([...previous].sort());
      previous = next;
    }
  });
  it('can reach every specimen, including at the edge of the random interval', () => {
    const seen = new Set<string>();
    for (let i = 0; i < SAMPLE_REPOS.length; i++) {
      const pair = randomDonors(
        undefined,
        () => (i + 0.5) / SAMPLE_REPOS.length,
      );
      pair.forEach((ref) => seen.add(ref));
    }
    expect(seen.size).toBe(SAMPLE_REPOS.length);
    expect(
      donorPair.safeParse(randomDonors(undefined, () => 0.999999)).success,
    ).toBe(true);
  });
});
