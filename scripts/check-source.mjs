import ts from 'typescript';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
async function files(dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((entry) =>
        entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
      ),
    )
  ).flat();
}
let failures = 0,
  count = 0;
for (const file of await files('src')) {
  const source = await readFile(file, 'utf8');
  if (
    source.includes('figma.com/api/mcp/asset') ||
    /from\s+['"].*(fixtures|tests\/)/.test(source) ||
    /localStorage|sessionStorage/.test(source)
  ) {
    console.error(`Boundary violation: ${file}`);
    failures++;
  }
  if (/\.tsx?$/.test(file) && !file.endsWith('.d.ts')) {
    const result = ts.transpileModule(source, {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
        isolatedModules: true,
      },
    });
    count++;
    for (const diagnostic of result.diagnostics ?? []) {
      if (diagnostic.category === ts.DiagnosticCategory.Error) {
        failures++;
        console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      }
    }
  }
}
console.log(
  `${count} TypeScript/TSX modules inspected. This is syntax + source-boundary inspection, NOT an Astro/React typecheck.`,
);
if (failures) process.exitCode = 1;
