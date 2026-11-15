import { readFile, mkdir, rename, rm } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
const manifest = JSON.parse(await readFile(process.argv[2] || 'docs/asset-manifest.json', 'utf8'));
await mkdir('public/design', { recursive: true });
let failures = 0;
for (const asset of manifest.assets) {
  if (basename(asset.file) !== asset.file || !/\.(png|svg)$/.test(asset.file))
    throw new Error('Unsafe asset filename');
  const url = new URL(asset.url);
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'www.figma.com' ||
    !url.pathname.startsWith('/api/mcp/asset/')
  )
    throw new Error('Expected an official Figma asset URL');
  const output = resolve('public/design', asset.file),
    temporary = output + '.part';
  const result = spawnSync(
    'curl',
    [
      '--fail',
      '-L',
      '--connect-timeout',
      '8',
      '--max-time',
      '45',
      '--proto',
      '=https',
      '--proto-redir',
      '=https',
      '-o',
      temporary,
      asset.url,
    ],
    { stdio: 'inherit' },
  );
  try {
    if (result.status !== 0) throw new Error('Download failed');
    const bytes = await readFile(temporary);
    const valid = asset.file.endsWith('.png')
      ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : /<svg[\s>]/.test(bytes.toString('utf8', 0, 1024));
    if (!valid || bytes.length < 40) throw new Error('Unexpected asset format');
    await rename(temporary, output);
    console.log(`Imported ${asset.file}`);
  } catch (error) {
    failures++;
    await rm(temporary, { force: true });
    console.error(`${asset.file}: ${error.message}`);
  }
}
if (failures) {
  console.error(
    `${failures} assets could not be imported. Re-export expired URLs; never replace with unrelated imagery.`,
  );
  process.exitCode = 1;
}
