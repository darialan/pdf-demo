import { writeFileSync } from 'node:fs';
writeFileSync('dist/index.d.ts', "export * from './types/index';\n");
