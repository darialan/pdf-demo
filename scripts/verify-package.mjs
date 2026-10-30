/** Install the exact release artifact in an empty consumer, including both module systems and TypeScript. */
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const requested = process.argv[2];
if (!requested) throw new Error('Provide the tarball path or published package version');
const spec = existsSync(requested) ? resolve(requested) : requested;
const dir = mkdtempSync(join(tmpdir(), 'web-printer-consumer-'));
const manifest = { name: 'release-consumer', private: true, type: 'module' };
const save = () => writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest, null, 2));
const run = (command, args) => execFileSync(command, args, { cwd: dir, stdio: 'inherit' });
// 用命令行形式安装：dependencies 里写 "name@version" 会被 npm 当成别名或 git 简写解析
const install = (extra = []) => run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org/', ...extra]);
save(); install([spec]);
if (existsSync(join(dir, 'node_modules/react'))) throw new Error('Core unexpectedly installed React');
const assertion = `if(typeof p.outputDocument!=='function'||typeof p.paginate!=='function')throw Error('Missing core exports');if(p.paginate(250,100,[]).length!==3)throw Error('Pagination failed');`;
run(process.execPath, ['--input-type=module', '-e', `import * as p from '${pkg.name}';${assertion}`]);
run(process.execPath, ['--input-type=commonjs', '-e', `const p=require('${pkg.name}');${assertion}`]);
install(['react@^18.2.0', '@types/react@^18.2.0']);
run(process.execPath, ['--input-type=module', '-e', `import {useWebPrinter,usePdfPrint} from '${pkg.name}/react';if(typeof useWebPrinter!=='function'||useWebPrinter!==usePdfPrint)throw Error('React exports failed');`]);
run(process.execPath, ['--input-type=commonjs', '-e', `const p=require('${pkg.name}/react');if(typeof p.useWebPrinter!=='function')throw Error('CJS React entry failed');`]);
writeFileSync(join(dir, 'consumer.ts'), `import {outputDocument,PRINT_ATTRIBUTES} from '${pkg.name}';\nimport {useWebPrinter,usePdfPrint} from '${pkg.name}/react';\nconst task: ReturnType<typeof outputDocument> = outputDocument({element:null,filename:'test',format:'png'});\nconst hook:typeof useWebPrinter=usePdfPrint;\nvoid [task,hook,PRINT_ATTRIBUTES.ATOMIC];\n`);
run(join(root, 'node_modules/.bin/tsc'), ['consumer.ts', '--noEmit', '--skipLibCheck', '--moduleResolution', 'node', '--target', 'ES2020', '--module', 'ESNext']);
console.log(`Verified ${spec}: ESM, CJS, optional React, types, installed dependencies. Consumer: ${dir}`);
