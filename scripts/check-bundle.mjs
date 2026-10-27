import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const files = (await readdir('apps/web/dist/assets')).filter((f) =>
  f.endsWith('.js'),
);
let bytes = 0;
for (const file of files)
  bytes += gzipSync(await readFile('apps/web/dist/assets/' + file)).byteLength;
console.log(
  'Built web JavaScript: ' +
    bytes +
    ' bytes gzipped (all chunks; limit 250000).',
);
if (bytes > 250000) process.exitCode = 1;
