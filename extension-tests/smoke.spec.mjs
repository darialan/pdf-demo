import { test, expect, chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
let context, worker, id, site, panel, temp;
test.beforeAll(async () => {
  temp = await fs.mkdtemp(
    path.join(os.tmpdir(), 'web-printer-extension-tests-'),
  );
  const extension = path.join(temp, 'extension');
  await fs.cp(path.resolve('extension/dist'), extension, { recursive: true });
  // Test-only loopback access replaces the browser toolbar gesture unavailable to headless Playwright.
  // The shipping manifest remains activeTab-only and is asserted in the security test.
  await fs.writeFile(
    path.join(extension, 'bootstrap.html'),
    '<html><title>Extension test setup</title></html>',
  );
  const manifest = JSON.parse(
    await fs.readFile(path.join(extension, 'manifest.json'), 'utf8'),
  );
  manifest.host_permissions = [
    'http://127.0.0.1/*',
    ...(process.env.WEB_PRINTER_LIVE_TESTS
      ? [
          'https://believed-breadfruit.top/*',
          'https://www.believed-breadfruit.top/*',
        ]
      : []),
  ];
  await fs.writeFile(
    path.join(extension, 'manifest.json'),
    JSON.stringify(manifest),
  );
  context = await chromium.launchPersistentContext(path.join(temp, 'profile'), {
    channel: 'chromium',
    headless: true,
    acceptDownloads: true,
    viewport: { width: 1440, height: 1000 },
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent('serviceworker'));
  id = new URL(worker.url()).host;
});
test.afterAll(async () => {
  await context?.close();
  if (temp) await fs.rm(temp, { recursive: true, force: true });
});
async function open(url = '/fixture') {
  if (panel) await panel.close();
  if (site) await site.close();
  site = await context.newPage();
  await site.goto(/^https?:/.test(url) ? url : 'http://127.0.0.1:4176' + url);
  await site.bringToFront();
  panel = await context.newPage();
  await panel.setViewportSize({ width: 390, height: 920 });
  await panel.goto(`chrome-extension://${id}/bootstrap.html`);
  const tabId = await panel.evaluate(async (targetUrl) => {
    await chrome.storage.local.clear();
    const tabs = await chrome.tabs.query({});
    return tabs.find((x) => x.url === targetUrl)?.id;
  }, site.url());
  await panel.evaluate(
    async (tabId) => chrome.tabs.update(tabId, { active: true }),
    tabId,
  );
  await panel.goto(`chrome-extension://${id}/sidepanel.html`);
  await expect(
    panel.getByRole('button', { name: '选择区域', exact: true }),
  ).toBeEnabled();
}
async function select(selector) {
  const target = site.locator(selector).first();
  await panel.getByRole('button', { name: /^选择区域$|^重新选择$/ }).click();
  await expect(site.locator('[data-web-printer-ui]')).toHaveCount(1);
  const point = await target.evaluate((root) => ({
    x: Math.min(100, root.getBoundingClientRect().width / 3),
    y: Math.min(120, root.getBoundingClientRect().height / 3),
  }));
  await target.click({ position: point, timeout: 15000 });
  const depth = await target.evaluate((root, point) => {
    const r = root.getBoundingClientRect();
    let node = document.elementFromPoint(r.left + point.x, r.top + point.y);
    if (!(node instanceof HTMLElement))
      node = node?.closest('svg')?.parentElement || node?.parentElement;
    let depth = 0;
    while (node && node !== root) {
      node = node.parentElement;
      depth++;
    }
    return node ? depth : 0;
  }, point);
  for (let i = 0; i < depth; i++)
    await panel.getByRole('button', { name: '选父级', exact: true }).click();
  if (process.env.WEB_PRINTER_LIVE_TESTS) {
    let refreshed = false;
    await expect
      .poll(
        async () => {
          if (await panel.locator('.sheet').isVisible()) return true;
          const current = await currentState();
          if (current.phase === 'stale' && !refreshed) {
            refreshed = true;
            await panel
              .getByRole('button', { name: '重新生成', exact: true })
              .click();
          }
          return false;
        },
        { timeout: 25000 },
      )
      .toBe(true);
  } else await expect(panel.locator('.sheet')).toBeVisible();
  await expect(
    panel.getByRole('button', { name: '导出 PDF', exact: true }),
  ).toBeEnabled();
}
test('MV3 prototype: select, snapshot preview, PDF and PNG download', async ({}, info) => {
  await open();
  await select('#article');
  await panel.screenshot({
    path: info.outputPath('extension-preview.png'),
    fullPage: true,
  });
  const reviewDir = path.resolve('extension-artifacts/review');
  await fs.mkdir(reviewDir, { recursive: true });
  const html = await panel.evaluate(() => {
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('script').forEach((node) => node.remove());
    const styles = [...document.styleSheets]
      .map((sheet) =>
        [...sheet.cssRules].map((rule) => rule.cssText).join('\n'),
      )
      .join('\n');
    clone
      .querySelectorAll('link[rel=stylesheet]')
      .forEach((node) => node.remove());
    const style = document.createElement('style');
    style.textContent = styles;
    clone.querySelector('head').append(style);
    return '<!doctype html>' + clone.outerHTML;
  });
  await fs.writeFile(path.join(reviewDir, 'panel.html'), html);
  await fs.copyFile(
    'public/brand-mark.svg',
    path.join(reviewDir, 'brand-mark.svg'),
  );

  let download = site.waitForEvent('download');
  await panel.getByRole('button', { name: '导出 PDF', exact: true }).click();
  const pdf = await download;
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  expect((await fs.readFile(await pdf.path())).subarray(0, 5).toString()).toBe(
    '%PDF-',
  );
  await expect(panel.getByRole('status')).toContainText('已生成');
  await panel.getByRole('button', { name: '选择导出格式' }).click();
  await panel.getByRole('menuitemradio', { name: /PNG 分页图片/ }).click();
  download = site.waitForEvent('download');
  await panel
    .getByRole('button', { name: '导出 PNG 图片', exact: true })
    .click();
  const zip = await download;
  expect(zip.suggestedFilename()).toMatch(/pages\.zip$/);
  expect((await fs.readFile(await zip.path())).readUInt32LE(0)).toBe(
    0x04034b50,
  );
});

async function pdfPages(download, expected) {
  const { getDocument, OPS } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({
    data: new Uint8Array(await fs.readFile(await download.path())),
    useSystemFonts: true,
  });
  const pdf = await task.promise;
  expect(pdf.numPages).toBe(expected);
  for (let i = 1; i <= pdf.numPages; i++) {
    const p = await pdf.getPage(i),
      v = p.getViewport({ scale: 1 });
    expect(v.width).toBeGreaterThan(100);
    expect(v.height).toBeGreaterThan(100);
    const ops = await p.getOperatorList();
    expect(
      ops.fnArray.some(
        (x) => x === OPS.paintImageXObject || x === OPS.paintInlineImageXObject,
      ),
    ).toBe(true);
    const text = await p.getTextContent();
    expect(text.items.map((x) => x.str).join(' ')).toContain(
      `${i} / ${expected}`,
    );
    p.cleanup();
  }
  await task.destroy();
}
async function pngPages(download, expected) {
  const buf = await fs.readFile(await download.path());
  let offset = 0,
    count = 0;
  while (buf.readUInt32LE(offset) === 0x04034b50) {
    const length = buf.readUInt32LE(offset + 18),
      namesize = buf.readUInt16LE(offset + 26),
      extra = buf.readUInt16LE(offset + 28);
    const name = buf.subarray(offset + 30, offset + 30 + namesize).toString();
    expect(name).toBe(`page-${String(count + 1).padStart(3, '0')}.png`);
    const start = offset + 30 + namesize + extra,
      bytes = buf.subarray(start, start + length);
    expect(bytes.subarray(1, 4).toString()).toBe('PNG');
    const width = bytes.readUInt32BE(16),
      height = bytes.readUInt32BE(20);
    expect(width / height).toBeCloseTo(210 / 297, 2);
    const visible = await panel.evaluate(async (data) => {
      const image = new Image();
      image.src = 'data:image/png;base64,' + data;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 120;
      canvas.height = 170;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, 120, 170);
      return [...ctx.getImageData(0, 0, 120, 170).data].filter(
        (x, i) => i % 4 !== 3 && x < 220,
      ).length;
    }, bytes.toString('base64'));
    expect(visible).toBeGreaterThan(10);
    count++;
    offset = start + length;
  }
  expect(count).toBe(expected);
}
async function currentState() {
  return panel.evaluate(async (targetUrl) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((t) => t.url === targetUrl);
    return new Promise((resolve, reject) => {
      const port = chrome.tabs.connect(tab.id, {
        name: 'web-printer-v1',
        frameId: 0,
      });
      const timer = setTimeout(() => {
        port.disconnect();
        reject(Error('state timeout'));
      }, 5000);
      port.onMessage.addListener((m) => {
        if (m.event === 'state') {
          clearTimeout(timer);
          port.disconnect();
          resolve(m.state);
        }
      });
    });
  }, site.url());
}
async function getPages() {
  return Number(
    (await panel.locator('.page-nav span').textContent()).match(
      /\/\s*(\d+)/,
    )[1],
  );
}
async function exportCurrent(format) {
  await panel.getByRole('button', { name: '选择导出格式' }).click();
  await panel
    .getByRole('menuitemradio', {
      name: format === 'pdf' ? 'PDF 文档' : /PNG 分页图片/,
    })
    .click();
  const download = site.waitForEvent('download', { timeout: 90000 });
  await panel
    .getByRole('button', {
      name: format === 'pdf' ? '导出 PDF' : '导出 PNG 图片',
      exact: true,
    })
    .click();
  const result = await download;
  await expect(panel.locator('.export-status')).toContainText('已生成');
  return result;
}
const scenes = [
  ['长表格', 'print-content6', 'long-table'],
  ['长文章', 'print-content-long-article', 'long-article'],
  ['复杂图文页面', 'print-content-complex-mixed', 'complex-mixed'],
  [
    '自定义页眉页脚',
    'print-content-custom-header-footer',
    'custom-header-footer',
  ],
];
for (const [label, rootId] of scenes) {
  test(`${label}: real extension preserves geometry and downloads matching PDF / PNG pages`, async ({}, info) => {
    await open('/#/playground');
    await site.getByRole('tab', { name: label, exact: true }).click();
    const root = site.locator(`#${rootId}`).first();
    await expect(root).toBeVisible();
    if (label === '复杂图文页面')
      await expect(root).toHaveAttribute('data-print-status', 'ready');
    const heapBefore = await site.evaluate(
      () => performance.memory?.usedJSHeapSize ?? null,
    );
    const before = await root.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });
    await select(`#${rootId}`);
    const pages = await getPages();
    expect(pages).toBeGreaterThan(label === '自定义页眉页脚' ? 0 : 1);
    await panel.getByRole('checkbox', { name: '显示分页标记' }).click();
    await expect(
      panel.getByRole('checkbox', { name: '显示分页标记' }),
    ).toBeChecked();
    await expect(site.locator('[data-print-debug]').first()).toBeVisible();
    expect(
      await root.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { width: r.width, height: r.height };
      }),
    ).toEqual(before);
    await expect(panel.locator('.sheet')).toBeVisible();
    await expect(
      panel.getByRole('button', { name: '导出 PDF', exact: true }),
    ).toBeEnabled();
    const pdf = await exportCurrent('pdf');
    await pdfPages(pdf, pages);
    const zip = await exportCurrent('png');
    await pngPages(zip, pages);
    const metrics = await currentState();
    const heapAfter = await site.evaluate(
      () => performance.memory?.usedJSHeapSize ?? null,
    );
    await info.attach('metrics.json', {
      body: JSON.stringify(
        {
          pages,
          heapBefore,
          heapAfter,
          preparedMs: metrics.preparedMs,
          pngExportMs: metrics.lastExport?.totalMs,
          pngBytes: metrics.lastExport?.bytes,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });
    await fs.mkdir('extension-artifacts/benchmarks', { recursive: true });
    await fs.writeFile(
      `extension-artifacts/benchmarks/${rootId}.json`,
      JSON.stringify(
        {
          pages,
          heapBefore,
          heapAfter,
          preparedMs: metrics.preparedMs,
          pngExportMs: metrics.lastExport?.totalMs,
          pngBytes: metrics.lastExport?.bytes,
        },
        null,
        2,
      ),
    );

    await panel.screenshot({
      path: info.outputPath('panel.png'),
      fullPage: true,
    });
    await fs.mkdir('extension-artifacts/proof', { recursive: true });
    await fs.copyFile(
      info.outputPath('panel.png'),
      `extension-artifacts/proof/${rootId}.png`,
    );
  });
}
test('exclude, undo, custom dimensions, header/footer, format change without repagination', async () => {
  await open();
  await select('#article');
  const original = await site.locator('#article').first().innerHTML();
  const first = await panel.locator('.sheet').getAttribute('src');
  await panel.getByRole('button', { name: '排除内容', exact: true }).click();
  await site.locator('.exclude-me').first().click();
  await expect(
    panel.getByRole('button', { name: '撤销排除（1）' }),
  ).toBeVisible();
  await expect(panel.locator('.sheet')).toBeVisible();
  expect(await panel.locator('.sheet').getAttribute('src')).not.toBe(first);
  expect(await site.locator('#article').first().innerHTML()).toBe(original);
  await panel.getByRole('button', { name: '撤销排除（1）' }).click();
  await expect(panel.locator('.sheet')).toBeVisible();
  await panel.locator('summary').click();
  await panel
    .getByRole('textbox', { name: '页眉文字' })
    .fill('Web Printer · 品牌页眉');
  await panel.getByRole('textbox', { name: '页脚文字' }).fill('内部文件');
  await expect(panel.locator('.sheet')).toBeVisible();
  await panel.getByLabel('页面尺寸', { exact: true }).selectOption('custom');
  await panel.getByLabel('宽度', { exact: true }).fill('160');
  await panel.getByLabel('高度', { exact: true }).fill('220');
  await expect(panel.locator('.sheet')).toBeVisible();
  await expect(
    panel.getByRole('button', { name: '导出 PDF', exact: true }),
  ).toBeEnabled();
  const pages = await getPages();
  const pdf = await exportCurrent('pdf');
  await pdfPages(pdf, pages);
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({
    data: new Uint8Array(await fs.readFile(await pdf.path())),
  });
  const doc = await task.promise;
  const view = (await doc.getPage(1)).getViewport({ scale: 1 });
  expect(view.width).toBeCloseTo((160 * 72) / 25.4, 1);
  expect(view.height).toBeCloseTo((220 * 72) / 25.4, 1);
  await task.destroy();
});
test('strict CSP still captures, and side panel widths do not overflow', async ({}, info) => {
  await open('/strict');
  await select('#article');
  await pdfPages(await exportCurrent('pdf'), await getPages());
  for (const width of [320, 390, 640]) {
    await panel.setViewportSize({ width, height: 920 });
    expect(
      await panel.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await panel.screenshot({
      path: info.outputPath(`panel-${width}.png`),
      fullPage: true,
    });
  }
});
test('mutations invalidate stale preview', async () => {
  await open();
  await select('#article');
  await panel.getByLabel('页面尺寸', { exact: true }).selectOption('custom');
  await panel.getByLabel('宽度', { exact: true }).fill('0');
  await expect(
    panel.getByRole('button', { name: '导出 PDF', exact: true }),
  ).toBeDisabled();
  await expect(panel.getByRole('alert').first()).toBeVisible();
  await panel.getByLabel('宽度', { exact: true }).fill('210');
  await panel.getByLabel('高度', { exact: true }).fill('297');
  await expect(panel.locator('.sheet')).toBeVisible();
  await site
    .locator('#article p')
    .first()
    .evaluate((el) => (el.textContent += ' Updated'));
  // 内容变化不再要求手动重新生成，而是自动后台刷新预览（检查 preparedMs 更新）
  const beforeMutation = await currentState();
  await expect.poll(async () => (await currentState()).preparedAt).not.toBe(
    beforeMutation.preparedAt,
  );
  await expect(panel.locator('.sheet')).toBeVisible();
  await expect(
    panel.getByRole('button', { name: '导出 PDF', exact: true }),
  ).toBeEnabled();
});
test('显示分页标记：懒加载滚动自动刷新且标记保持最顶层', async () => {
  await open();
  await select('#article');
  await expect(panel.locator('.sheet')).toBeVisible();

  // 站点自身的悬浮元素（z-index 99999）用来验证标记层压过一切站点内容
  await site.evaluate(() => {
    const el = document.createElement('div');
    el.id = 'debug-floating';
    el.textContent = 'floating overlay';
    el.style.cssText =
      'position:fixed;top:40vh;left:8px;z-index:99999;background:#fff;';
    document.body.append(el);
  });
  await panel.getByRole('checkbox', { name: '显示分页标记' }).click();
  await expect(
    panel.getByRole('checkbox', { name: '显示分页标记' }),
  ).toBeChecked();

  const markerStats = () =>
    site.evaluate(() => {
      const markers = Array.from(
        document.querySelectorAll('[data-print-debug="true"]'),
      ).filter((m) => m.id !== 'debug-floating');
      return {
        count: markers.length,
        maxZ: Math.max(
          ...markers.map((m) =>
            Math.max(
              Number(m.style?.zIndex || 0),
              Number(
                m.querySelector('span')?.style?.zIndex || 0,
              ),
            ),
          ),
          0,
        ),
      };
    });
  const before = await markerStats();
  expect(before.count).toBeGreaterThan(0);
  expect(before.maxZ).toBeGreaterThan(2147483000);

  // 模拟懒加载：滚动过程中内容持续增补
  const stateBefore = await currentState();
  for (let i = 0; i < 4; i++) {
    await site.mouse.wheel(0, 600);
    await site.waitForTimeout(250);
    await site.evaluate(() => {
      const article = document.querySelector('#article');
      const p = document.createElement('p');
      p.textContent = `懒加载段落 ${Date.now()}`;
      p.style.height = '120px';
      article.append(p);
    });
  }
  // 不再弹“内容已变化，请重新生成”，而是后台自动刷新
  await expect
    .poll(async () => (await currentState()).preparedAt, { timeout: 15000 })
    .not.toBe(stateBefore.preparedAt);
  const after = await currentState();
  expect(after.phase).toBe('ready');
  expect(after.inspecting).toBe(true);
  expect(after.error).toBeUndefined();
  expect(await panel.getByText('内容已变化，请重新生成').count()).toBe(0);
  await expect(
    panel.getByRole('button', { name: '导出 PDF', exact: true }),
  ).toBeEnabled();

  // 自动刷新后标记仍在且仍居顶层
  const refreshed = await markerStats();
  expect(refreshed.count).toBeGreaterThan(0);
  expect(refreshed.maxZ).toBeGreaterThan(2147483000);

  // 持续 churn（每 300ms 一次变更，共 5s）不应失控循环：刷新次数有上界
  const seen = new Set([after.preparedAt]);
  const churnEnd = Date.now() + 5000;
  while (Date.now() < churnEnd) {
    await site.evaluate(() => {
      const article = document.querySelector('#article');
      const p = document.createElement('p');
      p.textContent = `churn ${Date.now()}`;
      p.style.height = '40px';
      article.append(p);
    });
    await site.waitForTimeout(300);
    seen.add((await currentState()).preparedAt);
  }
  expect(seen.size).toBeGreaterThanOrEqual(2);
  expect(seen.size).toBeLessThanOrEqual(5);
});

test('playground 预览窗口的 z-index 高于分页标记层', async () => {
  await open('/#/playground');
  await site.getByRole('tab', { name: '长文章', exact: true }).click();
  await select('#print-content-long-article');

  // 扩展分页标记（标记层 2147483641–2147483643，压过一切站点内容）
  await panel.getByRole('checkbox', { name: '显示分页标记' }).click();
  await expect(
    panel.getByRole('checkbox', { name: '显示分页标记' }),
  ).toBeChecked();

  // 打开 playground 自己的预览窗口（应用“检查分页”会挂出 mini 预览浮窗，
  // 并且应用自身的调试标记与扩展共用同一 MARKER_LAYER）
  const inspectButton = site.getByRole('button', { name: '检查分页' });
  await expect(inspectButton).toBeEnabled({ timeout: 20000 });
  await inspectButton.click();
  await expect(
    site.locator('.mini-print-preview-widget'),
  ).toBeVisible({ timeout: 20000 });

  const layers = await site.evaluate(() => {
    const zOf = (el) => {
      const value = Number(getComputedStyle(el).zIndex);
      return Number.isNaN(value) ? 0 : value;
    };
    const widget = document.querySelector('.mini-print-preview-widget');
    const markers = Array.from(
      document.querySelectorAll('[data-print-debug="true"]'),
    );
    return {
      widgetZ: widget ? zOf(widget) : null,
      markerMax: Math.max(
        ...markers.map((m) =>
          Math.max(zOf(m), ...(m.querySelector('span') ? [zOf(m.querySelector('span'))] : [0])),
        ),
        0,
      ),
    };
  });
  // 标记仍压过普通站点内容（> 2147483000），但预览窗口必须再高一级
  expect(layers.markerMax).toBeGreaterThan(2147483000);
  expect(layers.widgetZ).toBeGreaterThan(layers.markerMax);
});

test('cancel export, close panel, navigation and reconnect clean all page artifacts', async () => {
  await open('/#/playground');
  await site.getByRole('tab', { name: '长文章', exact: true }).click();
  await select('#print-content-long-article');
  const downloads = [];
  site.on('download', (d) => downloads.push(d));
  await panel.getByRole('button', { name: '导出 PDF', exact: true }).click();
  await panel.getByRole('button', { name: '取消导出', exact: true }).click();
  await expect(
    panel.getByRole('button', { name: '导出 PDF', exact: true }),
  ).toBeEnabled();
  expect(downloads.length).toBe(0);
  await panel.getByRole('checkbox', { name: '显示分页标记' }).click();
  await expect(
    panel.getByRole('checkbox', { name: '显示分页标记' }),
  ).toBeChecked();
  await panel.close();
  panel = undefined;
  await expect(
    site.locator(
      '[data-print-snapshot],[data-print-debug],[data-web-printer-ui]',
    ),
  ).toHaveCount(0);
  await open();
  await select('#article');
  await site.reload();
  await expect(
    panel.getByRole('button', { name: '选择区域', exact: true }),
  ).toBeEnabled();
  await expect(panel.locator('.summary')).toContainText('尚未选择内容');
});
test('scrollers expand in the print copy and broken images degrade to declared placeholders', async () => {
  await open();
  await site
    .locator('#article')
    .first()
    .evaluate((el) => {
      const scroller = document.createElement('div');
      scroller.className = 'scroller';
      scroller.innerHTML = '<p class="tall">滚动内容</p>';
      el.append(scroller);
    });
  await panel.getByRole('button', { name: '选择区域', exact: true }).click();
  await site
    .locator('#article')
    .first()
    .click({ position: { x: 2, y: 2 } });
  await expect(panel.locator('.sheet')).toBeVisible();
  await expect(panel.locator('.notice').first()).toContainText('滚动区域');
  await expect(
    site.locator('[data-print-snapshot] .scroller').first(),
  ).toBeVisible();
  await site
    .locator('#article')
    .first()
    .evaluate((el) => {
      const img = new Image();
      img.alt = '坏图';
      img.src = 'http://127.0.0.1:1/missing.png';
      el.append(img);
    });
  // 内容变化（含坏图）触发自动后台刷新，警告与占位符在新预览中呈现
  const beforeMutation = await currentState();
  await expect.poll(async () => (await currentState()).preparedAt).not.toBe(
    beforeMutation.preparedAt,
  );
  await expect(
    panel.locator('.notice', { hasText: '图片' }).first(),
  ).toContainText('图片');
  await expect(panel.locator('.sheet')).toBeVisible();
  await expect(
    site.locator('[data-print-snapshot] [data-web-printer-placeholder]').last(),
  ).toContainText('坏图');
});
test('shipping manifest has no broad host permissions, no remote scripts, and minimal capabilities', async () => {
  const manifest = JSON.parse(
    await fs.readFile('extension/dist/manifest.json', 'utf8'),
  );
  expect(manifest.manifest_version).toBe(3);
  expect(manifest.permissions.sort()).toEqual(
    ['activeTab', 'scripting', 'sidePanel', 'storage'].sort(),
  );
  expect(manifest.host_permissions).toBeUndefined();
  expect(manifest.content_scripts).toBeUndefined();
  expect(manifest.content_security_policy.extension_pages).not.toContain(
    'unsafe-eval',
  );
});

test('escape, parent selection, whole document and format menu work from keyboard', async () => {
  await open();
  await panel.getByRole('button', { name: '选择区域', exact: true }).click();
  await site.keyboard.press('Escape');
  await expect(site.locator('[data-web-printer-ui]')).toHaveCount(0);
  await panel.getByRole('button', { name: '整个页面', exact: true }).click();
  await expect(panel.locator('.sheet')).toBeVisible();
  await expect(
    panel.getByText('整个页面仅包含当前已加载的主文档内容。'),
  ).toBeVisible();
  await panel.getByRole('button', { name: '选择导出格式' }).click();
  await panel.keyboard.press('ArrowDown');
  await panel.keyboard.press('Enter');
  await expect(
    panel.getByRole('button', { name: '导出 PNG 图片', exact: true }),
  ).toBeEnabled();
  await panel.getByRole('button', { name: '选择导出格式' }).click();
  await panel.keyboard.press('Escape');
  await expect(panel.getByRole('menu')).toHaveCount(0);
});
test('tab isolation: unrelated background navigation does not reset a prepared document', async () => {
  await open();
  await select('#article');
  const image = await panel.locator('.sheet').getAttribute('src');
  const other = await context.newPage();
  await other.goto('http://127.0.0.1:4176/fixture');
  await site.bringToFront();
  await expect(
    panel.getByRole('button', { name: '重新选择', exact: true }),
  ).toBeEnabled();
  // Switching away intentionally disposes the old connection; reconnect returns a clean state.
  await expect(panel.locator('.summary')).toContainText('把时间留给步行');
  await other.close();
  expect(image).toMatch(/^data:image\/jpeg/);
});
test('frozen export survives source changes, then requires refresh for the next export', async () => {
  await open('/#/playground');
  await site.getByRole('tab', { name: '长文章', exact: true }).click();
  await select('#print-content-long-article');
  const downloading = site.waitForEvent('download');
  await panel.getByRole('button', { name: '导出 PDF', exact: true }).click();
  await expect(
    panel.getByRole('button', { name: '取消导出', exact: true }),
  ).toBeVisible();
  await site
    .locator('#print-content-long-article')
    .first()
    .evaluate(
      (el) => (el.querySelector('p').textContent += ' 内容在导出期间更新'),
    );
  const file = await downloading;
  expect(file.suggestedFilename()).toMatch(/\.pdf$/);
  await expect(
    panel.getByRole('button', { name: '导出 PDF', exact: true }),
  ).toBeDisabled();
  await expect(panel.getByRole('alert').first()).toContainText('原页面已变化');
  await panel.getByRole('button', { name: '重新生成', exact: true }).click();
  await expect(panel.locator('.sheet')).toBeVisible();
});

test('live authorized local backend: inspect loaded page and export selected content', async ({}, info) => {
  test.skip(
    !process.env.WEB_PRINTER_LIVE_TESTS,
    'Explicit local live acceptance; no dependency on private local apps in CI.',
  );
  await open('http://127.0.0.1:4000/insights');
  await site
    .waitForLoadState('networkidle', { timeout: 10000 })
    .catch(() => {});
  await expect(site.locator('main').first()).toBeVisible();
  test.skip(
    (await site.locator('.skeleton-workbench-shell').count()) > 0,
    '真实后台持续展示加载骨架，不能将其当作业务内容通过验收；待页面可用后重跑。',
  );
  const structure = await site.locator('main').evaluateAll((nodes) =>
    nodes.map((el) => ({
      tag: el.tagName,
      children: [...el.children].map((x) => ({
        tag: x.tagName,
        classes: x.className,
        childCount: x.children.length,
      })),
      height: el.scrollHeight,
      clientHeight: el.clientHeight,
    })),
  );
  await info.attach('backend-structure', {
    body: JSON.stringify(structure, null, 2),
    contentType: 'application/json',
  });
  await site.screenshot({
    path: info.outputPath('backend-before.png'),
    fullPage: true,
  });
  await select('main');
  const file = await exportCurrent('pdf');
  expect((await fs.readFile(await file.path())).subarray(0, 5).toString()).toBe(
    '%PDF-',
  );
});
test('live public blog: select rendered article and export PDF', async ({}, info) => {
  test.skip(
    !process.env.WEB_PRINTER_LIVE_TESTS,
    'Explicit external live acceptance; deterministic fixtures cover CI.',
  );
  await open(
    'https://www.believed-breadfruit.top/2026/10/05/2026-10-06-%E5%AE%9A%E4%B9%89%E4%B8%80%E7%A7%8DAI-%E5%80%BA/',
  );
  const article = site.locator('article').first();
  await expect(article).toBeVisible();
  await site.screenshot({
    path: info.outputPath('blog-before.png'),
    fullPage: true,
  });
  await select('article');
  const file = await exportCurrent('pdf');
  expect((await fs.readFile(await file.path())).subarray(0, 5).toString()).toBe(
    '%PDF-',
  );
});

test('bad image becomes a declared placeholder while the rest of the selection stays exportable', async ({}, info) => {
  await open();
  await site
    .locator('#article')
    .first()
    .evaluate((el) => {
      const img = new Image(80, 80);
      img.alt = '无法读取的图片';
      img.className = 'bad-image';
      img.src = 'http://127.0.0.1:1/missing.png';
      el.append(img);
    });
  await panel.getByRole('button', { name: '选择区域', exact: true }).click();
  await site
    .locator('#article')
    .first()
    .click({ position: { x: 2, y: 2 } });
  await expect(panel.locator('.notice').first()).toContainText('图片');
  await panel.getByRole('checkbox', { name: '显示分页标记' }).click();
  await expect(
    panel.getByRole('checkbox', { name: '显示分页标记' }),
  ).toBeChecked();
  await expect(site.locator('[data-print-debug]').first()).toBeVisible();
  await expect(
    site.locator('[data-print-snapshot] [data-web-printer-placeholder]').last(),
  ).toContainText('无法读取的图片');
  await expect(
    panel.getByRole('button', { name: '导出 PDF', exact: true }),
  ).toBeEnabled();
  await pdfPages(await exportCurrent('pdf'), await getPages());
  await panel.getByRole('button', { name: '排除内容', exact: true }).click();
  await site.locator('.bad-image').first().click();
  await expect(panel.locator('.sheet')).toBeVisible();
  await expect(
    panel.getByRole('button', { name: '导出 PDF', exact: true }),
  ).toBeEnabled();
});

test('service worker restart preserves the live content session and subsequent export', async () => {
  await open();
  await select('#article');
  const before = await panel.locator('.sheet').getAttribute('src');
  const originalState = await currentState();
  const staleReply = await panel.evaluate(
    async ({ targetUrl, state }) => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((t) => t.url === targetUrl);
      return new Promise((resolve) => {
        const port = chrome.tabs.connect(tab.id, {
          name: 'web-printer-v1',
          frameId: 0,
        });
        port.onMessage.addListener((message) => {
          if (message.event === 'state')
            port.postMessage({
              channel: 'web-printer-v1',
              sessionId: state.sessionId,
              requestId: 'stale-prepare',
              revision: state.revision - 1,
              command: 'prepare',
            });
          if (message.requestId === 'stale-prepare') {
            port.disconnect();
            resolve(message);
          }
        });
      });
    },
    { targetUrl: site.url(), state: originalState },
  );
  expect(staleReply.ok).toBe(false);
  expect(staleReply.state.phase).toBe('ready');
  const cdp = await context.newCDPSession(site);
  let versions = [];
  cdp.on('ServiceWorker.workerVersionUpdated', (event) => {
    versions = event.versions;
  });
  await cdp.send('ServiceWorker.enable');
  await expect
    .poll(() =>
      versions.some(
        (v) => v.scriptURL === `chrome-extension://${id}/background.js`,
      ),
    )
    .toBe(true);
  const version = versions.find(
    (v) => v.scriptURL === `chrome-extension://${id}/background.js`,
  );
  await cdp.send('ServiceWorker.stopWorker', { versionId: version.versionId });
  expect(await panel.locator('.sheet').getAttribute('src')).toBe(before);
  const result = await panel.evaluate(() =>
    chrome.runtime.sendMessage({
      channel: 'web-printer-v1',
      command: 'connect',
    }),
  );
  expect(result.ok).toBe(true);
  await pdfPages(await exportCurrent('pdf'), await getPages());
  await cdp.detach();
});
test('virtual content fails explicitly while shadow DOM and embedded documents degrade to declared placeholders', async () => {
  for (const kind of ['virtual', 'shadow', 'iframe']) {
    await open();
    await site
      .locator('#article')
      .first()
      .evaluate((root, kind) => {
        const element = document.createElement(
          kind === 'iframe' ? 'iframe' : 'div',
        );
        element.style.cssText = 'width:300px;height:80px';
        if (kind === 'virtual') {
          element.setAttribute('aria-rowcount', '100');
          element.textContent = 'Only some rows are loaded';
        }
        if (kind === 'shadow')
          element.attachShadow({ mode: 'open' }).innerHTML =
            '<p>Shadow content</p>';
        root.append(element);
      }, kind);
    await panel.getByRole('button', { name: '选择区域', exact: true }).click();
    await expect(site.locator('[data-web-printer-ui]')).toHaveCount(1);
    await site
      .locator('#article')
      .first()
      .click({ position: { x: 2, y: 2 } });
    if (kind === 'virtual') {
      await expect(panel.getByRole('alert').first()).toContainText('虚拟');
      await expect(
        panel.getByRole('button', { name: '导出 PDF', exact: true }),
      ).toBeDisabled();
    } else {
      await expect(panel.locator('.sheet')).toBeVisible();
      await expect(
        panel.locator('.notice').first(),
      ).toContainText(kind === 'shadow' ? 'Shadow DOM' : '嵌入内容');
      await expect(
        site.locator('[data-print-snapshot] [data-web-printer-placeholder]').last(),
      ).toContainText(kind === 'shadow' ? 'Shadow DOM 内容未导出' : '嵌入内容未导出');
      await expect(
        panel.getByRole('button', { name: '导出 PDF', exact: true }),
      ).toBeEnabled();
    }
  }
});

test('fixed and sticky content is frozen inside the snapshot and classified automatically', async ({}, info) => {
  await open('/positioned');
  await site.evaluate(() => window.scrollTo(0, 80));
  const readSource = () =>
    site
      .locator('#positioned')
      .first()
      .evaluate((root) => {
        const r = root.getBoundingClientRect();
        return {
          html: root.outerHTML,
          root: { width: r.width, height: r.height },
          positions: ['fixed', 'nested'].map((id) => {
            const el = root.querySelector('#' + id),
              rect = el.getBoundingClientRect();
            return {
              id,
              x: rect.left - r.left,
              y: rect.top - r.top,
              width: rect.width,
              height: rect.height,
              position: getComputedStyle(el).position,
            };
          }),
        };
      });
  const before = await readSource();
  await select('#positioned');
  await expect(panel.getByRole('alert')).toHaveCount(0);
  const after = await readSource();
  const actual = await site
    .locator('[data-print-snapshot] #positioned')
    .evaluate((root) => {
      const r = root.getBoundingClientRect();
      return {
        root: { width: r.width, height: r.height },
        sticky: {
          top:
            root.querySelector('#sticky').getBoundingClientRect().top - r.top,
          position: getComputedStyle(root.querySelector('#sticky')).position,
        },
        positions: ['fixed', 'nested'].map((id) => {
          const el = root.querySelector('#' + id),
            rect = el.getBoundingClientRect();
          return {
            id,
            x: rect.left - r.left,
            y: rect.top - r.top,
            width: rect.width,
            height: rect.height,
            position: getComputedStyle(el).position,
          };
        }),
        remaining: [...root.querySelectorAll('*')].filter((el) =>
          ['fixed', 'sticky'].includes(getComputedStyle(el).position),
        ).length,
      };
    });
  expect(actual.remaining).toBe(0);
  expect(actual.sticky.position).toBe('relative');
  expect(actual.sticky.top).toBeCloseTo(30, 0);
  for (let i = 0; i < actual.positions.length; i++) {
    const original = after.positions[i],
      copy = actual.positions[i];
    expect(copy.position).toBe('absolute');
    for (const key of ['x', 'y', 'width', 'height'])
      expect(
        Math.abs(original[key] - copy[key]),
        `${copy.id} ${key}`,
      ).toBeLessThan(0.6);
  }
  expect(after.html).toBe(before.html);
  expect(after.root).toEqual(before.root);
  const pages = await getPages();
  expect(pages).toBeGreaterThan(1);
  await pdfPages(await exportCurrent('pdf'), pages);
  await pngPages(await exportCurrent('png'), pages);
  await panel.screenshot({
    path: info.outputPath('positioned-panel.png'),
    fullPage: true,
  });
  await fs.mkdir('extension-artifacts/proof', { recursive: true });
  await fs.copyFile(
    info.outputPath('positioned-panel.png'),
    'extension-artifacts/proof/positioned-panel.png',
  );
});

test('regression: ordinary landing page with embedded preview can export its other content', async ({}, info) => {
  await open('/?lang=zh');
  await expect(site.locator('.landing-sheet').first()).toBeVisible();
  await panel.getByRole('button', { name: '整个页面', exact: true }).click();
  await expect(panel.locator('.sheet')).toBeVisible({ timeout: 30000 });
  await expect(panel.getByRole('button', { name: '导出 PDF', exact: true })).toBeEnabled();
  await pdfPages(await exportCurrent('pdf'), await getPages());
  await panel.screenshot({ path: info.outputPath('landing-extension.png'), fullPage: true });
});

test('regression: translated selected container is printable without editing the webpage', async () => {
  await open();
  await site.locator('#article').evaluate(el => { el.style.transform = 'translate(0px, 0px)'; });
  await select('#article');
  await pdfPages(await exportCurrent('pdf'), await getPages());
});

test('regression: scrollable selection exports all loaded rows without changing source scroll', async () => {
  await open();
  await site.locator('#article').evaluate(el => {
    el.style.height = '240px'; el.style.overflow = 'auto';
    el.scrollTop = 80;
  });
  const before = await site.locator('#article').evaluate(el => ({ html: el.outerHTML, scroll: el.scrollTop }));
  await select('#article');
  const snapshot = site.locator('[data-print-snapshot] #article');
  expect(await snapshot.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThan(800);
  const pages = await getPages();
  expect(pages).toBeGreaterThanOrEqual(1);
  await pdfPages(await exportCurrent('pdf'), pages);
  expect(await site.locator('#article').first().evaluate(el => ({ html: el.outerHTML, scroll: el.scrollTop }))).toEqual(before);
});

test('live reported blog: whole page previews and downloads a complete document', async ({}, info) => {
  test.skip(!process.env.WEB_PRINTER_LIVE_TESTS, 'Explicit live website regression');
  await open('https://www.believed-breadfruit.top/2026/10/05/2026-10-06-%E5%AE%9A%E4%B9%89%E4%B8%80%E7%A7%8DAI-%E5%80%BA/');
  await site.locator('article').first().waitFor();
  const structure = await site.evaluate(() => [...document.body.querySelectorAll('*')].flatMap(el => {
    const css = getComputedStyle(el), r = el.getBoundingClientRect();
    const kinds = [];
    if (el.matches('iframe,object,embed,video')) kinds.push('embedded');
    if (el.shadowRoot) kinds.push('shadow');
    if (/auto|scroll/.test(css.overflowY) && el.scrollHeight > el.clientHeight + 2) kinds.push('scroll');
    if (/url\(/.test(css.backgroundImage)) kinds.push('background');
    if (el.matches('img') && (!el.complete || !el.naturalWidth)) kinds.push('pending-image');
    return kinds.length ? [{ tag: el.tagName, id: el.id, className: el.className, kinds, width: r.width, height: r.height, background: css.backgroundImage, src: el.getAttribute('src') }] : [];
  }));
  await info.attach('page-structure.json', { body: JSON.stringify(structure, null, 2), contentType: 'application/json' });
  await fs.writeFile('extension-artifacts/reported-blog-structure.json', JSON.stringify(structure, null, 2));
  await panel.getByRole('button', { name: '整个页面', exact: true }).click();
  await expect(panel.locator('.sheet')).toBeVisible({ timeout: 45000 });
  const pages = await getPages();
  await pdfPages(await exportCurrent('pdf'), pages);
  await pngPages(await exportCurrent('png'), pages);
  await panel.screenshot({ path: info.outputPath('reported-blog-panel.png'), fullPage: true });
});
