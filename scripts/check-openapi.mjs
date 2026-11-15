import { readFile } from 'node:fs/promises';
import openapiTS, { astToString, COMMENT_HEADER } from 'openapi-typescript';

const schema = JSON.parse(await readFile('openapi.json', 'utf8'));
const expected = `${COMMENT_HEADER}${astToString(await openapiTS(schema))}`;
const generated = await readFile('src/lib/api/generated/openapi.d.ts', 'utf8');

if (generated !== expected) {
  console.error('Generated OpenAPI types are stale. Run npm run openapi:generate.');
  process.exitCode = 1;
} else {
  console.log('Generated OpenAPI types match openapi.json.');
}
