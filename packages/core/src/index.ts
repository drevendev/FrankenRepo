import { z } from 'zod';

export class LabError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public retryable = false,
  ) {
    super(message);
    this.name = 'LabError';
  }
}

export function normalizeRepo(input: string): string {
  const ref = input.trim();
  const match =
    /^(?:https:\/\/github\.com\/)?([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\/([A-Za-z0-9_.-]{1,100})\/?$/.exec(
      ref,
    );
  if (
    !match ||
    match[2] === '.' ||
    match[2] === '..' ||
    match[1].includes('--')
  )
    throw new LabError(
      'INVALID_REPO',
      'Use owner/repo or https://github.com/owner/repo, without extra paths, queries or fragments.',
    );
  return match[1] + '/' + match[2];
}

export const repoRef = z
  .string()
  .max(180)
  .transform((s, ctx) => {
    try {
      return normalizeRepo(s);
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid public GitHub repository reference',
      });
      return z.NEVER;
    }
  });
export const donorPair = z
  .tuple([repoRef, repoRef])
  .refine(
    ([a, b]) => a.toLowerCase() !== b.toLowerCase(),
    'Choose two different repositories.',
  );
export const modeSchema = z.enum(['useful', 'cursed', 'chaotic']);
export type RitualMode = z.infer<typeof modeSchema>;
export const inspectSchema = z.strictObject({ donors: donorPair });
export const ritualSchema = z.strictObject({
  donors: donorPair,
  mode: modeSchema,
  clientRequestId: z.uuid(),
});
const traitSchema = z.strictObject({
  text: z.string().min(8).max(140),
  evidenceIds: z
    .array(z.string().regex(/^[AB]:[a-zA-Z]+$/))
    .min(1)
    .max(3),
});
export const monsterDraftSchema = z.strictObject({
  name: z.string().min(3).max(60),
  hook: z.string().min(1).max(180),
  brain: traitSchema,
  body: traitSchema,
  curse: traitSchema,
  firstWords: z.string().min(1).max(120),
  usefulMutation: z.string().min(20).max(240),
  uncertainty: z.string().min(8).max(140),
  humorTags: z
    .array(z.string().regex(/^[a-z][a-z0-9-]{0,30}$/))
    .min(1)
    .max(3),
});
export const draftJsonSchema = z.toJSONSchema(monsterDraftSchema);
export type MonsterDraft = z.infer<typeof monsterDraftSchema>;
export type EvidenceAtom = {
  id: string;
  field: string;
  value: string;
  sourceUrl: string;
  observedAt: string;
  status: 'observed' | 'partial' | 'unknown';
};
export type DonorGenome = {
  ref: string;
  url: string;
  observedAt: string;
  defaultBranch: string;
  commitSha: string | null;
  license: string;
  description: string | null;
  topics: string[];
  languages: string[];
  readme: string | null;
  evidence: EvidenceAtom[];
  warnings: string[];
};
export const PROMPT_VERSION = 'frankenrepo/prompt/v4';
export const MODE_PRESETS = {
  useful:
    'USEFUL: restrained gothic humor. Invent a modest developer tool with a clearly named user action. usefulMutation must name a concrete input, an operation combining BOTH donor mechanisms, and a visible output artifact. Describe a proposed prototype, never a proven capability.',
  cursed:
    'CURSED: gothic character comedy. Make a specific donor-mechanism mismatch into the creature’s fictional personal inconvenience, never a defect of either real repository. Keep one concrete, small prototype idea using BOTH donors.',
  chaotic:
    'CHAOTIC: the hook MUST show an absurd physical job with an actor, action and object. The object and the comic obstacle must come from the two selected donor mechanisms; do not attach a random chef, ghost or prop to an unrelated technical idea. Carry the SAME collision through hook, curse and firstWords so the joke has a recognizable cause. Keep a concrete small prototype underneath it. Darkness, chaos and data-weaver slogans alone are insufficient.',
} satisfies Record<RitualMode, string>;

export function validateDraft(
  value: unknown,
  donors: [DonorGenome, DonorGenome],
): MonsterDraft {
  const draft = monsterDraftSchema.parse(value);
  const ids = new Set(
    donors.flatMap((d) =>
      d.evidence.filter((e) => e.status !== 'unknown').map((e) => e.id),
    ),
  );
  for (const slot of [draft.brain, draft.body, draft.curse]) {
    if (slot.evidenceIds.some((id) => !ids.has(id)))
      throw new LabError(
        'INVALID_EVIDENCE',
        'The model cited an unavailable source.',
        502,
        true,
      );
  }
  if (
    !draft.brain.evidenceIds.some((id) => id.startsWith('A:')) ||
    !draft.body.evidenceIds.some((id) => id.startsWith('B:'))
  )
    throw new LabError(
      'INVALID_EVIDENCE',
      'Both donors must contribute to the creature.',
      502,
      true,
    );
  // Metrics and URLs belong exclusively to the code-created evidence panel.
  const prose = [
    draft.name,
    draft.hook,
    draft.brain.text,
    draft.body.text,
    draft.curse.text,
    draft.firstWords,
    draft.usefulMutation,
    draft.uncertainty,
  ].join(' ');
  if (
    /[0-9]|https?:|www\.|<[^>]*>|this repo is dead|\b[AB]:[a-z]+\b/i.test(prose)
  )
    throw new LabError(
      'UNSAFE_DRAFT',
      'The model included unsupported numbers, markup, inline source IDs or factual claims. Try another ritual.',
      502,
      true,
    );
  return draft;
}

export type SpriteRecipe = {
  recipeVersion: 'frankenrepo/sprite/v1';
  seed: string;
  body: number;
  head: number;
  accessory: number;
  palette: number;
  expression: number;
  flavor: number;
};
export const FLAVORS = [
  'files issues in its sleep',
  'is terrified of semicolons',
  'eats merge conflicts for breakfast',
  'haunts the documentation',
  'dreams in lowercase',
  'collects orphaned brackets',
  'has a haunted rubber duck',
  'whispers to the compiler',
  'keeps a tiny backup coffin',
  'smells faintly of lightning',
  'waves at passing branches',
  'wears its bugs as jewelry',
  'knits extremely long stack traces',
  'sleeps under the changelog',
  'politely requests more thunder',
  'has excellent graveyard etiquette',
];
export function spriteRecipe(seed: string): SpriteRecipe {
  let h = 2166136261;
  for (const c of 'v1:' + seed)
    h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const next = (n: number) => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    return Math.floor((h / 4294967296) * n);
  };
  return {
    recipeVersion: 'frankenrepo/sprite/v1',
    seed,
    body: next(6),
    head: next(6),
    accessory: next(5),
    palette: next(6),
    expression: next(4),
    flavor: next(FLAVORS.length),
  };
}
const PALETTES = [
  ['#b7e477', '#54764b', '#242e35'],
  ['#bca2e8', '#70558b', '#292437'],
  ['#70d8cf', '#3b7c80', '#203335'],
  ['#efb47c', '#9a684d', '#372d2c'],
  ['#e4b1d1', '#905774', '#342a38'],
  ['#cbd085', '#7b804d', '#30352a'],
];
const BODIES = [
  'M48 88h64v51H48z',
  'M54 86h52l15 54H39z',
  'M42 88h76v38l-14 15H56l-14-15z',
  'M58 84h44l10 13v46H48V97z',
  'M42 94l20-9h36l20 9-8 47H50z',
  'M48 85h64v24l10 12-10 20H48l-10-20 10-12z',
];
const HEADS = [
  'M48 30h64v54H48z',
  'M42 42l15-17h46l15 17v30l-15 13H57L42 72z',
  'M52 25h56v59H52z',
  'M40 36h80v35l-15 14H55L40 71z',
  'M52 34l10-12h36l10 12v51H52z',
  'M44 30h72v43l-13 12H57L44 73z',
];
export function escapeXml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[c]!,
  );
}
export function monsterSvg(r: SpriteRecipe): string {
  const [skin, shade, ink] = PALETTES[r.palette];
  const accessory = [
    '<path d="M37 38h86v8H37zM56 17h48v22H56z" fill="#514361"/><path d="M56 30h48v7H56z" fill="#d4b27b"/>',
    '<path d="M53 33L44 12l22 15M107 33l9-21-22 15" fill="#e6d8ae"/>',
    '<path d="M74 27V10h12v17" fill="#b3a0cb"/><circle cx="80" cy="9" r="7" fill="#dcfa9e"/>',
    '<path d="M44 33l-8-17 18 9M116 33l8-17-18 9" fill="#cfb3df"/>',
    '<path d="M47 35V15l18 9 15-13 15 13 18-9v20" fill="#d4b27b"/>',
  ][r.accessory];
  const eyes =
    r.expression === 1
      ? '<path d="M58 55h13m18 0h13" stroke="#20252b" stroke-width="5"/>'
      : '<g class="monster-eyes"><path d="M57 49h16v15H57zM87 49h16v15H87z" fill="#f7f0cc"/><path d="M64 53h6v9h-6zM90 53h6v9h-6z" fill="#20252b"/></g>';
  const mouth = [
    'M67 73h26',
    'M69 69v6h22v-6',
    'M71 75v-6h18v6',
    'M65 70l11 5 19-5',
  ][r.expression];
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 170" role="img" aria-label="A fictional stitched laboratory creature" shape-rendering="crispEdges">' +
    '<ellipse cx="80" cy="158" rx="47" ry="7" fill="#10151c" opacity=".5"/>' +
    '<path d="M49 134h22v22H43v-9h6zM89 134h22v13h6v9H89z" fill="' +
    shade +
    '"/>' +
    '<path d="' +
    BODIES[r.body] +
    '" fill="' +
    shade +
    '" stroke="' +
    ink +
    '" stroke-width="4"/>' +
    '<path d="M46 94H32v30h13M114 94h14v30h-13" fill="none" stroke="' +
    skin +
    '" stroke-width="10"/>' +
    '<path d="M56 93l24 15 24-15M80 108v31" fill="none" stroke="' +
    ink +
    '" stroke-width="3"/>' +
    '<path d="' +
    HEADS[r.head] +
    '" fill="' +
    skin +
    '" stroke="' +
    ink +
    '" stroke-width="4"/>' +
    '<path d="M42 66h-9v9h9M118 66h9v9h-9" fill="#adb3ae"/>' +
    '<path d="M78 30v15m-6-10h12m-12 7h12" stroke="' +
    shade +
    '" stroke-width="2"/>' +
    eyes +
    '<path d="' +
    mouth +
    '" stroke="' +
    ink +
    '" stroke-width="3" fill="none"/>' +
    accessory +
    '<path d="M59 112l8 8-8 8-8-8z" fill="#e8bd85"/><path d="M59 116v8m-4-4h8" stroke="#544e45" stroke-width="2"/></svg>'
  );
}
export type MonsterRecord = {
  schemaVersion: 'frankenrepo/monster/v1';
  id: string;
  createdAt: string;
  mode: RitualMode;
  model: {
    provider: 'ollama' | 'cloudflare';
    id: string;
    digest?: string;
    promptVersion: string;
  };
  parents: [DonorGenome, DonorGenome];
  evidence: EvidenceAtom[];
  draft: MonsterDraft;
  sprite: SpriteRecipe;
  publication: { state: 'ephemeral' };
  lineage: { parentMonsterIds: string[]; depth: 0 };
  contentHash: string;
};
export type JobState =
  | 'queued'
  | 'inspecting'
  | 'splicing'
  | 'validating'
  | 'completed'
  | 'failed'
  | 'cancelled';
export type RitualJob = {
  ritualId: string;
  state: JobState;
  updatedAt: string;
  expiresAt: string;
  monster?: MonsterRecord;
  error?: { code: string; message: string; retryable: boolean };
};
export function monsterAlt(m: MonsterRecord): string {
  return (
    m.draft.name +
    ': ' +
    m.draft.hook +
    ' Fictional creature inspired by ' +
    m.parents.map((p) => p.ref).join(' and ') +
    '. Brain: ' +
    m.draft.brain.text +
    '. Body: ' +
    m.draft.body.text +
    '. Curse: ' +
    m.draft.curse.text +
    '. Generated with ' +
    m.model.id +
    '.'
  );
}
export function certificateSvg(m: MonsterRecord): string {
  const wrap = (text: string, max = 57) => {
    const lines: string[] = [];
    let current = '';
    const words = text.split(/\s+/).flatMap((word) => {
      const parts: string[] = [];
      for (let i = 0; i < word.length; i += max)
        parts.push(word.slice(i, i + max));
      return parts;
    });
    for (const word of words) {
      if (current && current.length + word.length + 1 > max) {
        lines.push(current);
        current = word;
      } else current += (current ? ' ' : '') + word;
    }
    if (current) lines.push(current);
    return lines;
  };
  const block = (
    text: string,
    y: number,
    size = 17,
    color = '#333f37',
    max = 57,
  ) =>
    wrap(text, max)
      .map(
        (line, i) =>
          '<text x="48" y="' +
          (y + i * 25) +
          '" fill="' +
          color +
          '" font-family="Georgia, serif" font-size="' +
          size +
          '">' +
          escapeXml(line) +
          '</text>',
      )
      .join('');
  let y = 407 + wrap(m.draft.hook).length * 25 + 28;
  let details = '';
  for (const [label, value] of [
    ['BRAIN', m.draft.brain.text],
    ['BODY', m.draft.body.text],
    ['CURSE', m.draft.curse.text],
    ['POTENTIALLY USEFUL MUTATION', m.draft.usefulMutation],
  ]) {
    details += block(label, y, 12, '#576746');
    y += 25;
    details += block(value, y);
    y += wrap(value).length * 25 + 24;
  }
  for (const [text, size, max] of [
    ['“' + m.draft.firstWords + '”', 18, 57],
    ['Speculative, not an evaluated recommendation.', 13, 75],
    [m.draft.uncertainty, 13, 75],
    [m.parents.map((p) => p.ref + ' · ' + p.license).join(' + '), 12, 80],
    ['Generated with ' + m.model.id + ' · ' + m.mode, 12, 80],
    [
      m.createdAt +
        ' · Fictional interpretation of bounded public GitHub data.',
      11,
      90,
    ],
    ...m.parents.map((p) => ['Source: ' + p.url, 10, 90]),
  ] as [string, number, number][]) {
    details += block(text, y, size, '#576746', max);
    y += wrap(text, max).length * 25 + 14;
  }
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="680" height="' +
    (y + 30) +
    '" viewBox="0 0 680 ' +
    (y + 30) +
    '">' +
    '<title>' +
    escapeXml(m.draft.name) +
    ' — Monster Birth Certificate</title><desc>' +
    escapeXml(monsterAlt(m)) +
    '</desc>' +
    '<rect width="680" height="100%" fill="#f1e8cf"/><rect x="18" y="18" width="644" height="' +
    (y - 6) +
    '" fill="none" stroke="#7c8661" stroke-width="2"/>' +
    block('FRANKENREPO · MONSTER BIRTH CERTIFICATE', 60, 14) +
    block(m.draft.name, 106, 27, '#22372c', 38) +
    '<svg x="235" y="150" width="210" height="225">' +
    monsterSvg(m.sprite)
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>$/, '') +
    '</svg>' +
    block(m.draft.hook, 407, 18) +
    details +
    '</svg>'
  );
}
