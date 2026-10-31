import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const manifest = JSON.parse(
  await fs.readFile('extension/dist/manifest.json', 'utf8'),
);
await fs.mkdir('extension-artifacts', { recursive: true });
const output = path.resolve(
  `extension-artifacts/web-printer-extension-${manifest.version}.zip`,
);
await fs.rm(output, { force: true });
execFileSync('zip', ['-qr', output, '.'], {
  cwd: path.resolve('extension/dist'),
});
console.log(output);
