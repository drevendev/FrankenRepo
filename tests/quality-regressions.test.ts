import { expect, it } from 'vitest';
import { validateDraft, type MonsterRecord } from '@frankenrepo/core';
import failedRevision from '../docs/eval/runs/2026-10-31T14-23-42-050Z-revision.json';
it('rejects the actually observed false lineage certification from the saved negative revision', () => {
  const card = failedRevision.record as unknown as MonsterRecord;
  expect(() => validateDraft(card.draft, card.parents)).toThrow(
    /cannot certify identity or lineage/,
  );
});
it('rejects an actual archived tragedy joke even when the unsupported promise is removed', () => {
  const card = failedRevision.record as unknown as MonsterRecord;
  const draft = {
    ...card.draft,
    usefulMutation:
      'A proposed source-linked queue could flag archival candidates for human review without establishing identity.',
  };
  expect(() => validateDraft(draft, card.parents)).toThrow(
    /never repression or human tragedy/,
  );
});
