import { build } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const outDir = path.join(root, 'extension/dist');
await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });
const bundledPackages = new Set();
const notices = {
  name: 'extension-third-party-notices',
  moduleParsed({ id }) {
    const index = id.lastIndexOf('/node_modules/');
    if (index < 0) return;
    const rest = id.slice(index + 14).split('/');
    const count = rest[0].startsWith('@') ? 2 : 1;
    bundledPackages.add(
      id.slice(0, index + 14) + rest.slice(0, count).join('/'),
    );
  },
};

for (const entry of ['content/index', 'background']) {
  await build({
    configFile: false,
    plugins: [notices],
    publicDir: false,
    build: {
      outDir,
      emptyOutDir: false,
      target: 'chrome116',
      minify: true,
      lib: {
        entry: path.join(root, `extension/${entry}.ts`),
        name: entry.startsWith('content')
          ? 'WebPrinterContent'
          : 'WebPrinterBackground',
        formats: ['iife'],
        fileName: () =>
          entry.startsWith('content') ? 'content.js' : 'background.js',
      },
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  });
}
await build({
  configFile: false,
  plugins: [notices],
  root: path.join(root, 'extension'),
  publicDir: false,
  base: './',
  build: {
    outDir,
    emptyOutDir: false,
    target: 'chrome116',
    rollupOptions: { input: path.join(root, 'extension/sidepanel.html') },
  },
});
await fs.copyFile(
  'extension/manifest.json',
  path.join(outDir, 'manifest.json'),
);
await fs.copyFile('public/logo192.png', path.join(outDir, 'icon.png'));
await fs.copyFile('public/brand-mark.svg', path.join(outDir, 'brand-mark.svg'));
await fs.copyFile('LICENSE', path.join(outDir, 'LICENSE'));
let noticeText = 'Web Printer — bundled dependency notices\n';
for (const dir of [...bundledPackages].sort()) {
  try {
    const pkg = JSON.parse(
      await fs.readFile(path.join(dir, 'package.json'), 'utf8'),
    );
    noticeText += `\n--- ${pkg.name}@${pkg.version} ---\n`;
    for (const filename of (await fs.readdir(dir)).filter((name) =>
      /^(license|licence|copying|notice)([.-].*)?$/i.test(name),
    )) {
      const file = path.join(dir, filename);
      if ((await fs.stat(file)).isFile())
        noticeText += (await fs.readFile(file, 'utf8')) + '\n';
    }
  } catch {}
}
await fs.writeFile(path.join(outDir, 'THIRD-PARTY-NOTICES.txt'), noticeText);
console.log(`Extension built: ${outDir}`);
