import { readFile, writeFile } from 'node:fs/promises';
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const packages = Object.entries(lock.packages)
  .filter(([path, p]) => path.includes('node_modules/') && !p.link)
  .map(([path, p]) => ({
    name: path.slice(path.lastIndexOf('node_modules/') + 13),
    version: p.version,
    license: p.license ?? 'UNKNOWN',
    dev: p.dev ?? false,
    optional: p.optional ?? false,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
const unknown = packages.filter((p) => p.license === 'UNKNOWN');
await writeFile(
  'docs/DEPENDENCIES.json',
  JSON.stringify(
    {
      source: 'package-lock.json',
      packages,
      unknownLicenses: unknown.map((p) => p.name),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Locked package records: ' +
    packages.length +
    '; unknown license metadata: ' +
    unknown.length,
);
console.log(
  'License identifiers: ' +
    [...new Set(packages.map((p) => p.license))].sort().join(', '),
);
if (unknown.length) process.exitCode = 1;
