import { readFile, writeFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const publication = JSON.parse(
  await readFile('docs/submission/PUBLISHED.json', 'utf8'),
);
const categoryReview = JSON.parse(
  await readFile('docs/submission/CATEGORY_REVIEW.json', 'utf8'),
);
const runs = [];
for (const file of (await readdir('docs/eval/runs'))
  .filter((f) => f.startsWith('2026-10-31') && f.endsWith('.json'))
  .sort()) {
  const path = 'docs/eval/runs/' + file,
    r = JSON.parse(await readFile(path, 'utf8'));
  runs.push({
    path,
    kind: r.kind,
    startedAt: r.startedAt,
    state: r.state ?? r.status,
    recordName: r.record?.draft?.name ?? null,
    promptVersion: r.record?.model?.promptVersion ?? null,
    model: r.record?.model?.id ?? null,
    hasReview: !!r.review,
    error: r.error ?? null,
    originalPreserved: r.originalStillUnchanged ?? null,
    frozenSnapshots: r.frozenSnapshots ?? null,
    exports: r.exports ?? [],
    selectionApprovedByHuman: false,
  });
}
const manifest = {
  schemaVersion: 'frankenrepo/local-evidence-bundle/v1',
  createdAt: new Date().toISOString(),
  baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim(),
  worktreeDirty: true,
  publicDemoUrl: null,
  articlePublished: !!publication.url,
  articleUrl: publication.url,
  publicationRecord: 'docs/submission/PUBLISHED.json',
  articleRecordingReceipt: 'docs/submission/DEMO_REAL_RECEIPT.json',
  releaseCreated: false,
  categoryReview: 'docs/submission/CATEGORY_REVIEW.json',
  verifiedLocalScenarios: categoryReview.included.map((c) => c.name),
  postDeadlineSourceUpdate: true,
  runs,
  partnerReceipts: [
    'docs/eval/ATLAS_V2_QUALIFICATION.json',
    'docs/eval/PARTNER_QUALIFICATION_ROLLUP.json',
    'docs/eval/SENTRY_CONSOLE_VERIFICATION.json',
    'docs/eval/SENTRY_CONTROLLED_FAILURE.json',
    'docs/eval/BROWSERBASE_RESEARCH.json',
    'docs/eval/TINKER_PREFLIGHT.json',
  ],
  negativeEditorialReview: 'docs/eval/V02_QUALITY_REVIEW.md',
  deferredList: 'docs/partners/UPDATE_RESULT_RU.md',
};
await writeFile(
  'docs/submission/V02_EVIDENCE_MANIFEST.json',
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(
  'Local evidence manifest: ' +
    runs.length +
    ' receipts; no human shortlist or public demo claimed.',
);
