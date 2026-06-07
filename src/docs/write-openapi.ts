import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openApiSpec } from './openapi';

const outputPath = resolve(process.cwd(), 'openapi.generated.json');
writeFileSync(outputPath, `${JSON.stringify(openApiSpec, null, 2)}\n`, 'utf8');
console.log(`OpenAPI spec written to ${outputPath}`);
