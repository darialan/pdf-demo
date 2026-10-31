// Diagnostic: whole-page export against the live reported blog.
// Reports per-page pixel density of exported PNGs, plus state/console errors.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const BLOG = process.env.DIAG_URL || 'https://www.believed-breadfruit.top/2026/10/05/2026-10-06-%E5%AE%9A%E4%B9%89%E4%B8%80%E7%A7%8DAI-%E5%80%BA/';
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'wp-diag-'));
const extension = path.join(temp, 'extension');
await fs.cp(path.resolve('extension/dist'), extension, { recursive: true });
await fs.writeFile(path.join(extension, 'bootstrap.html'), '<html><title>diag</title></html>');
const manifest = JSON.parse(await fs.readFile(path.join(extension, 'manifest.json'), 'utf8'));
manifest.host_permissions = ['http://127.0.0.1/*', 'https://believed-breadfruit.top/*', 'https://www.believed-breadfruit.top/*'];
await fs.writeFile(path.join(extension, 'manifest.json'), JSON.stringify(manifest));

const context = await chromium.launchPersistentContext(path.join(temp, 'profile'), {
  channel: 'chromium', headless: true, acceptDownloads: true,
  viewport: { width: 1440, height: 1000 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});
const worker = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'));
const id = new URL(worker.url()).host;

const siteLogs = [];
const site = await context.newPage();
site.on('console', (m) => siteLogs.push(`[site:${m.type()}] ${m.text()}`.slice(0, 300)));
site.on('pageerror', (e) => siteLogs.push(`[site:error] ${e.message}`.slice(0, 300)));
await site.goto(BLOG, { waitUntil: 'load', timeout: 60000 });
await site.waitForTimeout(3000);

const panel = await context.newPage();
const panelLogs = [];
panel.on('console', (m) => panelLogs.push(`[panel:${m.type()}] ${m.text()}`.slice(0, 300)));
panel.on('pageerror', (e) => panelLogs.push(`[panel:error] ${e.message}`.slice(0, 300)));
await panel.goto(`chrome-extension://${id}/bootstrap.html`);
await panel.setViewportSize({ width: 390, height: 920 });
const tabId = await panel.evaluate(async (targetUrl) => {
  await chrome.storage.local.clear();
  const tabs = await chrome.tabs.query({});
  return tabs.find((x) => x.url === targetUrl)?.id;
}, site.url());
await panel.evaluate(async (tabId) => chrome.tabs.update(tabId, { active: true }), tabId);
await panel.goto(`chrome-extension://${id}/sidepanel.html`);
await panel.getByRole('button', { name: '选择区域', exact: true }).waitFor({ state: 'visible', timeout: 20000 });

// whole page
await panel.getByRole('button', { name: '整个页面', exact: true }).click();
const sheet = panel.locator('.sheet');
try {
  await sheet.waitFor({ state: 'visible', timeout: 60000 });
  console.log('PREVIEW OK');
} catch {
  console.log('PREVIEW FAILED');
  await panel.screenshot({ path: 'extension-artifacts/diag-panel-error.png', fullPage: true });
}

// record every body-subtree mutation while we idle, to find the staleness culprit
const muts = await site.evaluate(
  () =>
    new Promise((resolve) => {
      const log = [];
      const observer = new MutationObserver((records) => {
        for (const r of records.slice(0, 5)) {
          const t = r.target;
          if (t.closest?.('[data-print-snapshot],[data-print-debug],[data-web-printer-ui]')) continue;
          log.push(
            `${r.type} <${t.nodeName} class=${(t.className || '').toString().slice(0, 60)}> attr=${r.attributeName} added=${r.addedNodes.length} removed=${r.removedNodes.length}`,
          );
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
      setTimeout(() => resolve(log), 3000);
    }),
);
console.log('MUTATIONS WHILE IDLE:', muts.length ? muts.slice(0, 10) : 'none');

// dump panel alert/error text
const alerts = await panel.locator('[role=alert], .error, .export-status').allTextContents();
console.log('ALERTS:', JSON.stringify(alerts.filter(Boolean)));

// dump the preview thumbnail actually shown in the panel (no viewport resize involved)
const src1 = await panel.locator('.sheet').getAttribute('src').catch(() => null);
if (src1) {
  const data1 = Buffer.from(src1.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  await fs.writeFile('extension-artifacts/diag-preview-sheet.png', data1);
  console.log('PREVIEW SHEET SAVED', data1.length, 'bytes');
} else console.log('NO PREVIEW SHEET');

// export PNG and inspect every page
const downloadPromise = site.waitForEvent('download', { timeout: 180000 });
try {
  await panel.getByRole('button', { name: '选择导出格式' }).click();
  await panel.getByRole('menuitemradio', { name: /PNG 分页图片/ }).click();
  await panel.getByRole('button', { name: '导出 PNG 图片', exact: true }).click();
  const download = await downloadPromise;
  const zipPath = await download.path();
  const buf = await fs.readFile(zipPath);
  console.log('ZIP bytes:', buf.length);
  let offset = 0, count = 0;
  const pages = [];
  while (buf.readUInt32LE(offset) === 0x04034b50) {
    const length = buf.readUInt32LE(offset + 18), namesize = buf.readUInt16LE(offset + 26), extra = buf.readUInt16LE(offset + 28);
    const name = buf.subarray(offset + 30, offset + 30 + namesize).toString();
    const start = offset + 30 + namesize + extra;
    const bytes = buf.subarray(start, start + length);
    await fs.writeFile(`extension-artifacts/diag-${name}`, bytes);
    const dark = await panel.evaluate(async (data) => {
      const image = new Image();
      image.src = 'data:image/png;base64,' + data;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth / 4;
      canvas.height = image.naturalHeight / 4;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let darkRows = 0, rows = canvas.height, darkCount = 0;
      for (let y = 0; y < rows; y++) {
        let rowDark = 0;
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          if (d[i] < 200 && d[i + 3] > 0) { rowDark++; darkCount++; }
        }
        if (rowDark > 2) darkRows++;
      }
      return { darkCount, darkPct: darkCount / (canvas.width * canvas.height), darkRows, rows };
    }, bytes.toString('base64'));
    pages.push({ name, bytes: length, ...dark });
    count++;
    offset = start + length;
  }
  console.log('PAGES:', JSON.stringify(pages, null, 1));
} catch (e) {
  console.log('EXPORT FAILED:', e.message.split('\n')[0]);
  console.log(await panel.locator('[role=alert]').allTextContents());
}

console.log('--- PANEL LOGS ---');
console.log(panelLogs.filter(l => /error|warn/i.test(l)).slice(0, 20).join('\n') || '(none)');
console.log('--- SITE LOGS (errors) ---');
console.log(siteLogs.filter(l => /error/i.test(l)).slice(0, 20).join('\n') || '(none)');
await context.close();
await fs.rm(temp, { recursive: true, force: true });
