import {
  spriteRecipe,
  type DonorGenome,
  type MonsterDraft,
  type MonsterRecord,
  PROMPT_VERSION,
} from '@frankenrepo/core';
export const TEST_DRAFT: MonsterDraft = {
  name: 'The Merge Wraith',
  hook: 'It draws diagrams of the bugs it intends to haunt.',
  brain: {
    text: 'Keeps a tiny map of every unfinished thought',
    evidenceIds: ['A:description'],
  },
  body: {
    text: 'Sketches its own increasingly improbable limbs',
    evidenceIds: ['B:description'],
  },
  curse: {
    text: 'Every brilliant idea arrives wearing a tiny cape',
    evidenceIds: ['A:description', 'B:description'],
  },
  firstWords: 'I appear to be somebody else’s problem.',
  usefulMutation:
    'A sketchpad that turns small project ideas into editable diagrams with linked source notes.',
  uncertainty:
    'An imagined concept, with feasibility and demand still untested.',
  humorTags: ['haunted-sketchpad'],
};
export function genome(
  slot: 'A' | 'B',
  ref = slot === 'A' ? 'test/brain' : 'test/body',
): DonorGenome {
  const observedAt = '2026-10-27T08:00:00.000Z',
    url = 'https://github.com/' + ref;
  return {
    ref,
    url,
    observedAt,
    defaultBranch: 'main',
    commitSha: 'a'.repeat(40),
    license: 'UNKNOWN',
    description:
      'TEST FIXTURE: ' +
      (slot === 'A'
        ? 'A source-linked thought map.'
        : 'A small editable drawing tool.'),
    topics: [],
    languages: ['TypeScript'],
    readme: null,
    evidence: [
      {
        id: slot + ':description',
        field: 'description',
        value: 'TEST FIXTURE: example purpose.',
        sourceUrl: url,
        observedAt,
        status: 'observed',
      },
    ],
    warnings: ['TEST FIXTURE — no live GitHub read.'],
  };
}
export const TEST_DONORS: [DonorGenome, DonorGenome] = [
  genome('A'),
  genome('B'),
];
export function testMonster(): MonsterRecord {
  return {
    schemaVersion: 'frankenrepo/monster/v1',
    id: 'e0edfd4a-7bfd-4a2a-b479-29e5f0973cf2',
    createdAt: '2026-10-27T08:00:00.000Z',
    mode: 'cursed',
    model: {
      provider: 'ollama',
      id: 'TEST FIXTURE — not a model run',
      promptVersion: PROMPT_VERSION,
    },
    parents: TEST_DONORS,
    evidence: TEST_DONORS.flatMap((d) => d.evidence),
    draft: TEST_DRAFT,
    sprite: spriteRecipe('test-wraith'),
    publication: { state: 'ephemeral' },
    lineage: { depth: 0, parentMonsterIds: [] },
    contentHash: 'test-only',
  };
}
