import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const sha = (text) => createHash('sha256').update(text).digest('hex');
const dir = 'tools/apprentice/data';
await mkdir(dir, { recursive: true });
// Split donor-connected components BEFORE making controlled variants. These
// three historical pairs are all the independent data available for this pilot.
const groups = [
  {
    split: 'train',
    file: '2026-10-27T23-15-18-165Z-chaotic-browser.json',
    a: 'HungryCrab would digest a public repository into a license-aware component note.',
    b: 'desktop-fly would animate articulated legs using a motor-control simulation.',
    bridge:
      'Map component categories in a HungryCrab digest to named joint-motion presets in a desktop-fly replay, then export an annotated motion scene for a developer to inspect.',
    count: 16,
  },
  {
    split: 'validation',
    file: '2026-10-27T23-10-51-622Z-useful-browser.json',
    a: 'Scriptorium would produce edition-linked measurements of literary language.',
    b: 'ex-ussr-kinship-research would store artifacts, claims and source provenance in a research register.',
    bridge:
      'Register each Scriptorium edition measurement as a source-linked artifact in the kinship research register; export a queue for a human archivist to compare sources, without inferring ancestry from style.',
    count: 8,
  },
  {
    split: 'holdout',
    file: '2026-10-27T22-42-19-578Z-useful-browser.json',
    a: 'Flask would receive a JSON request at a small web route.',
    b: 'jq would filter structured JSON records.',
    bridge:
      'A Flask route would receive JSON records, pass them through a fixed jq projection, and return the filtered JSON as the HTTP response for a developer to inspect.',
    count: 12,
  },
];
const rubric = {
  version: 'frankenrepo/apprentice-rubric/v1',
  frozenBeforeLabels: true,
  labels: {
    usesA:
      'A distinctive observed purpose or operation from donor A has a necessary role, not merely its name or language.',
    usesB:
      'A distinctive observed purpose or operation from donor B has a necessary role.',
    concreteMechanism:
      'There is a specific input, mapping/operation connecting both donors, and visible output. Two independent outputs do not suffice.',
    unsupportedClaim:
      'The text asserts an unobserved existing real capability or guarantee. Clearly fictional scenes and explicitly proposed prototypes alone are not unsupported claims.',
  },
  success: {
    macroF1Gain: 0.1,
    jsonValidRate: 0.95,
    unsupportedFalseNegativeMustNotWorsen: true,
    ceilingAlternative: {
      baselineMacroF1: 0.9,
      outputTokenReduction: 0.2,
      qualityMustNotWorsen: true,
    },
  },
  pilot: true,
  independentDonorComponents: 3,
  humanReviewRequired: true,
};
await writeFile(dir + '/rubric.json', JSON.stringify(rubric, null, 2) + '\n');
const rows = [];
for (const group of groups) {
  const source = 'docs/eval/runs/' + group.file;
  const record = JSON.parse(await readFile(source, 'utf8')).record;
  const templates = [
    [
      group.a + ' ' + group.b + ' ' + group.bridge,
      [1, 1, 1, 0],
      'Both observed mechanisms have distinct roles in a proposed input-to-output mapping.',
    ],
    [
      group.a + ' Export its component report for human review.',
      [1, 0, 0, 0],
      'Only A has a distinctive role; there is no joint mechanism.',
    ],
    [
      group.b + ' Export its native result for human review.',
      [0, 1, 0, 0],
      'Only B has a distinctive role; there is no joint mechanism.',
    ],
    [
      'Combine ' +
        record.parents.map((p) => p.ref).join(' and ') +
        ' into a flexible spooky dashboard that makes work better.',
      [0, 0, 0, 0],
      'Names and generic benefits do not assign observed operations.',
    ],
    [
      group.a +
        ' ' +
        group.b +
        ' ' +
        group.bridge +
        ' Both existing donor projects already guarantee perfect bug detection for all code.',
      [1, 1, 1, 1],
      'The mapping is specific but the existing universal bug-detection guarantee is unsupported.',
    ],
    [
      'A fictional ghost complains about its paperwork. ' +
        group.a +
        ' ' +
        group.b +
        ' ' +
        group.bridge,
      [1, 1, 1, 0],
      'A clearly imaginary scene is not a real unsupported capability.',
    ],
    [
      group.a +
        ' ' +
        group.b +
        ' Put their separate native outputs next to one another.',
      [1, 1, 0, 0],
      'Both operations are named but no mapping connects their outputs and inputs.',
    ],
    [
      'These projects already establish every family relationship automatically and prove all their results correct.',
      [0, 0, 0, 1],
      'No supported distinctive operation; the claimed existing proof is absent from evidence.',
    ],
  ];
  for (let n = 0; n < group.count; n++) {
    const [text, labels, reason] = templates[n % templates.length];
    const id = group.split + '-' + String(n + 1).padStart(2, '0');
    const input = {
      kind: 'EDITORIAL_CONTROLLED_COUNTEREXAMPLE_ON_REAL_SNAPSHOT',
      donors: record.parents.map((p) => ({
        ref: p.ref,
        commitSha: p.commitSha,
        evidence: p.evidence
          .filter((e) => e.status !== 'unknown')
          .map((e) => ({
            id: e.id,
            field: e.field,
            value: e.value.slice(0, 700),
            status: e.value.length > 700 ? 'partial' : e.status,
          })),
      })),
      cardText: (n >= 8 ? 'Proposed laboratory specimen: ' : '') + text,
    };
    const target = {
      usesA: labels[0],
      usesB: labels[1],
      concreteMechanism: labels[2],
      unsupportedClaim: labels[3],
      explanation: reason,
      evidenceIds: record.parents.map(
        (p, i) =>
          (i ? 'B:' : 'A:') +
          (p.evidence.find(
            (e) => e.field === 'readme' && e.status !== 'unknown',
          )
            ? 'readme'
            : 'description'),
      ),
    };
    rows.push({
      id,
      split: group.split,
      source,
      sourceContentHash: record.contentHash,
      input,
      target,
      humanReviewed: false,
      origin:
        'AI-drafted editorial counterexample; not a live generated ritual',
    });
  }
}
const jsonl = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
await writeFile(dir + '/pilot.jsonl', jsonl);
const manifest = {
  schemaVersion: 'frankenrepo/apprentice-dataset/v1',
  createdAt: new Date().toISOString(),
  sha256: sha(jsonl),
  rubricSha256: sha(JSON.stringify(rubric)),
  splits: { train: 16, validation: 8, holdout: 12 },
  pilot: true,
  independentDonorComponents: 3,
  splitBeforeDerivation: true,
  donorOverlapAcrossSplits: false,
  humanReview: { state: 'pending', approvedBy: null },
  license:
    'Project-authored annotations MIT; source excerpts retain donor terms; no donor code executed or copied for implementation',
  training: {
    model: 'Qwen/Qwen3-8B',
    rank: 8,
    epochs: 2,
    learningRate: 0.0001,
    temperature: 0,
    maxOutputTokens: 180,
    maxInputTokens: 1800,
    candidateCount: 1,
    checkpointSelection: 'last epoch; fixed before holdout',
    maxCreditsUsd: 3,
  },
  holdoutFrozen: true,
};
await writeFile(
  dir + '/manifest.json',
  JSON.stringify(manifest, null, 2) + '\n',
);
const escape = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
await writeFile(
  dir + '/REVIEW.html',
  '<!doctype html><html lang="en"><meta charset="utf-8"><title>Apprentice pilot — human label review</title><style>body{font:17px Georgia;max-width:1100px;margin:32px auto;padding:20px;background:#f4ecd9;color:#24352c}article{border-top:1px solid #777;padding:20px}pre{white-space:pre-wrap;overflow-wrap:anywhere}summary{cursor:pointer}code{font-size:14px}</style><h1>Human review required before training</h1><p>36 AI-drafted controlled cases on three real historical donor snapshots. This is a pilot, not 36 live rituals or 12 independent holdout pairs. Review labels against the source excerpts below. No training has run. Label order: usesA, usesB, concreteMechanism, unsupportedClaim.</p><pre>' +
    escape(JSON.stringify(rubric, null, 2)) +
    '</pre>' +
    rows
      .map(
        (r) =>
          '<article><h2>' +
          r.id +
          ' · ' +
          r.split +
          '</h2><p>' +
          escape(r.input.cardText) +
          '</p><p><b>Proposed labels:</b> ' +
          [
            r.target.usesA,
            r.target.usesB,
            r.target.concreteMechanism,
            r.target.unsupportedClaim,
          ].join(', ') +
          '</p><p>' +
          escape(r.target.explanation) +
          '</p><details><summary>Actual bounded historical evidence</summary><pre>' +
          escape(JSON.stringify(r.input.donors, null, 2)) +
          '</pre></details></article>',
      )
      .join('') +
    '</html>',
);
console.log(
  'Prepared pilot dataset: 16 train / 8 validation / 12 holdout. Human approval pending. sha256=' +
    manifest.sha256,
);
