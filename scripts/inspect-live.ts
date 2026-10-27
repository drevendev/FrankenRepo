import { writeFile, mkdir } from 'node:fs/promises';
import { GitHubAdapter } from '@frankenrepo/adapters';
const refs = process.argv.slice(2);
if (refs.length !== 2)
  throw new Error('Pass exactly two public owner/repo references.');
const start = new Date().toISOString();
const github = new GitHubAdapter();
const donors = await Promise.all([
  github.inspect(refs[0], 'A'),
  github.inspect(refs[1], 'B'),
]);
const result = {
  kind: 'LIVE_PUBLIC_GITHUB_READ',
  startedAt: start,
  endedAt: new Date().toISOString(),
  modelInvoked: false,
  donors: donors.map(
    ({ ref, url, observedAt, commitSha, license, languages, warnings }) => ({
      ref,
      url,
      observedAt,
      commitSha,
      license,
      languages,
      warnings,
    }),
  ),
};
await mkdir('docs/eval', { recursive: true });
await writeFile(
  'docs/eval/GITHUB_SMOKE.json',
  JSON.stringify(result, null, 2) + '\n',
);
console.log(JSON.stringify(result, null, 2));
