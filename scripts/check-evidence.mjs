import { readFile, access, readdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
const status = JSON.parse(await readFile('docs/partners/STATUS.json', 'utf8'));
const verified = status.categories.filter((c) => c.status === 'VERIFIED');
if (verified.length !== status.verifiedCount)
  throw new Error(
    'Partner verifiedCount does not match the evidence manifest.',
  );
for (const category of verified) {
  if (!category.evidencePath || !category.verifiedAt)
    throw new Error('A verified category lacks dated evidence.');
  await access(category.evidencePath);
}
if (
  !status.publicDemoUrl &&
  status.categories.some((c) => c.enabledInPublicDemo)
)
  throw new Error(
    'Public features cannot be claimed without an actual demo URL.',
  );
const files = [];
async function walk(path) {
  for (const item of await readdir(path, { withFileTypes: true })) {
    const name = path + '/' + item.name;
    if (item.isDirectory()) await walk(name);
    else if (/\.(?:json|md|html|js|css|svg|txt)$/.test(name)) files.push(name);
  }
}
for (const path of [
  'docs/eval',
  'docs/partners',
  'docs/submission',
  'apps/web/dist',
])
  await walk(path);
const values = [];
try {
  const env = parseEnv(await readFile('.env', 'utf8'));
  for (const key of [
    'CF_API_TOKEN',
    'CF_ACCOUNT_ID',
    'GITHUB_READ_TOKEN',
    'MONGODB_URI',
    'TINKER_API_KEY',
    'BACKBOARD_API_KEY',
    'PAPER_INSTRUMENTS_API_KEY',
    'BROWSERBASE_API_KEY',
    'SENTRY_DSN',
    'SESSION_SECRET',
  ])
    if (env[key]?.length >= 8) values.push({ key, value: env[key] });
} catch {
  /* CI has no operator credentials. */
}
try {
  const cards = JSON.parse(
    await readFile('.local/qualification-cards.json', 'utf8'),
  );
  for (const card of cards)
    if (card.token) values.push({ key: 'owner-capability', value: card.token });
} catch {
  /* No private operator archive in CI. */
}
const leaks = [];
for (const file of files) {
  const text = await readFile(file, 'utf8');
  for (const { key, value } of values)
    if (text.includes(value)) leaks.push({ file, key });
}
if (leaks.length) {
  console.error(JSON.stringify(leaks));
  throw new Error(
    'Private server data found in a public artifact. Values were not printed.',
  );
}
console.log(
  `Evidence consistency and secret/capability scan passed (${files.length} text artifacts; ${verified.length} verified categories).`,
);
