import { expect, it } from 'vitest';
import { readmeExcerpt } from '@frankenrepo/adapters';
it('keeps descriptive README paragraphs within the cap without treating badges or art as a mechanism', () => {
  const purpose =
    'This repository turns a bounded source-linked component digest into a developer note for human review.';
  const raw =
    '![badge](https://example.invalid/badge.svg)\n\n██████ ▒▒▒▒▒▒ ░░░░░░\n\n```sh\nnever execute donor commands\n```\n\n' +
    purpose +
    '\n\n' +
    'Additional descriptive words about the source. '.repeat(100);
  const excerpt = readmeExcerpt(raw);
  expect(excerpt.startsWith(purpose)).toBe(true);
  expect(excerpt.length).toBeLessThanOrEqual(1500);
  expect(excerpt).not.toContain('badge.svg');
  expect(excerpt).not.toContain('never execute');
});
