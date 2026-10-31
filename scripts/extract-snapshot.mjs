// Export exact snapshot HTML from the fixture run into a standalone html2canvas repro page.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const URL_ = process.env.DIAG_URL || 'http://127.0.0.1:4176/review/blog-fixture.html';
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'wp-diag-'));
const extension = path.join(temp, 'extension');
await fs.cp(path.resolve('extension/dist'), extension, { recursive: true });
await fs.writeFile(path.join(extension, 'bootstrap.html'), '<html></html>');
const manifest = JSON.parse(await fs.readFile(path.join(extension, 'manifest.json'), 'utf8'));
manifest.host_permissions = ['http://127.0.0.1/*', 'https://believed-breadfruit.top/*', 'https://www.believed-breadfruit.top/*'];
await fs.writeFile(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
const context = await chromium.launchPersistentContext(path.join(temp, 'profile'), {
  channel: 'chromium', headless: true, viewport: { width: 1440, height: 1000 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});
const worker = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'));
const id = new URL(worker.url()).host;
const site = await context.newPage();
await site.goto(URL_, { waitUntil: 'load', timeout: 60000 });
await site.waitForTimeout(2000);
const panel = await context.newPage();
await panel.setViewportSize({ width: 390, height: 920 });
await panel.goto(`chrome-extension://${id}/bootstrap.html`);
const tabId = await panel.evaluate(async (u) => {
  const tabs = await chrome.tabs.query({});
  return tabs.find((x) => x.url === u)?.id;
}, site.url());
await panel.evaluate((t) => chrome.tabs.update(t, { active: true }), tabId);
await panel.goto(`chrome-extension://${id}/sidepanel.html`);
await panel.getByRole('button', { name: '选择区域', exact: true }).waitFor();
await panel.getByRole('button', { name: '整个页面', exact: true }).click();
await panel.locator('.sheet').waitFor({ state: 'visible', timeout: 60000 });
console.log('preview ready');

// grab: host element style, snapshot html, and a plain html2canvas attempt inside the page
const result = await site.evaluate(async () => {
  const host = document.querySelector('[data-print-snapshot]');
  const html = host.outerHTML;
  const cs = getComputedStyle(host);
  return {
    html,
    hostStyle: { position: cs.position, left: cs.left, top: cs.top, width: cs.width, height: cs.height },
    hostRect: JSON.parse(JSON.stringify(host.getBoundingClientRect())),
  };
});
console.log('HOST:', JSON.stringify(result.hostStyle), JSON.stringify(result.hostRect));
await fs.writeFile('extension-artifacts/review/snapshot.html', result.html);
await context.close();
await fs.rm(temp, { recursive: true, force: true });
console.log('saved snapshot.html');
