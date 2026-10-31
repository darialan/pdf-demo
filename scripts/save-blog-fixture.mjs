// Saves the live blog as a mostly-self-contained fixture (stylesheets inlined, scripts removed).
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const URL_ =
  'https://www.believed-breadfruit.top/2026/10/05/2026-10-06-%E5%AE%9A%E4%B9%89%E4%B8%80%E7%A7%8DAI-%E5%80%BA/';
const browser = await chromium.launch({ channel: 'chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(URL_, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(5000);
const html = await page.evaluate(async () => {
  const clone = document.documentElement.cloneNode(true);
  clone.querySelectorAll('script').forEach((n) => n.remove());
  // inline every stylesheet (same-origin read + CORS-enabled CDN fetch)
  const sheets = [...document.styleSheets];
  const parts = [];
  for (const sheet of sheets) {
    try {
      parts.push([...sheet.cssRules].map((r) => r.cssText).join('\n'));
    } catch {
      try {
        const text = await fetch(sheet.href).then((r) => r.text());
        parts.push(text);
      } catch (e) {
        parts.push(`/* failed: ${sheet.href} */`);
      }
    }
  }
  clone.querySelectorAll('link[rel=stylesheet]').forEach((n) => n.remove());
  clone
    .querySelectorAll('style')
    .forEach((n) => n.remove());
  const style = document.createElement('style');
  style.textContent = parts.join('\n');
  clone.querySelector('head').append(style);
  return '<!doctype html>' + clone.outerHTML;
});
await fs.writeFile('extension-artifacts/review/blog-fixture.html', html);
console.log('saved', html.length, 'bytes');
await browser.close();
