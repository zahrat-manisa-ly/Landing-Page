import { readFile, stat } from 'node:fs/promises';
const manifest = JSON.parse(await readFile('docs/asset-manifest.json', 'utf8'));
let missing = 0;
for (const asset of manifest.assets) {
  try {
    const file = `public/design/${asset.file}`;
    if ((await stat(file)).size < 40) throw new Error('empty');
    const bytes = await readFile(file);
    if (
      asset.file.endsWith('.png') &&
      !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      throw new Error('invalid PNG');
    if (asset.file.endsWith('.svg') && !/<svg[\s>]/.test(bytes.toString('utf8', 0, 1024)))
      throw new Error('invalid SVG');
  } catch {
    console.error(`MISSING OR INVALID: ${asset.file} (Figma ${asset.node})`);
    missing++;
  }
}
if (missing) {
  console.error(`${missing} design assets outstanding. Production visual acceptance is blocked.`);
  process.exitCode = 1;
} else
  console.log(
    `All ${manifest.assets.length} design assets are present. Verify crops and geometry in the browser.`,
  );
