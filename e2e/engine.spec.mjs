import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://127.0.0.1:4174/e2e/fixtures/engine.html');
  await page.waitForFunction(() => window.fixtureReady);
});

test('ignore selectors reflow real grid layout, preserve internal styles, and release snapshots', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { prepareLayout, DEFAULT_SETTINGS, serializePrintSnapshot, outputPDF } = window.engine;
    const root = document.getElementById('fixture');
    root.style.cssText = 'width:800px;margin:24px auto;padding:20px;box-sizing:border-box;font-size:17px';
    root.innerHTML = '<section style="display:grid;grid-template-columns:1fr 1fr;gap:20px"><div class="omit"><img src="broken.png">filters</div><p style="margin:12px 0">retained text</p></section><div class="protected" style="height:150px;background:rgb(12,34,56)">keep together</div><textarea>old</textarea><canvas width="200" height="30"></canvas>';
    root.querySelector('textarea').value = 'new note';
    const context = root.querySelector('canvas').getContext('2d');
    context.fillStyle = 'red'; context.fillRect(0, 0, 200, 30);
    const ruleConfig = { ignore: ['.omit'], atomic: ['.protected'] };
    const layout = await prepareLayout({ element: root, settings: DEFAULT_SETTINGS, ruleConfig });
    const measured = { pages: layout.pages.length, sourceMargin: root.style.margin,
      cloneMargin: getComputedStyle(layout.root).marginLeft,
      ignored: layout.root.querySelector('.omit') === null,
      background: getComputedStyle(layout.root.querySelector('.protected')).backgroundColor,
      padding: getComputedStyle(layout.root).padding,
      note: serializePrintSnapshot(layout.root).includes('new note'),
      canvas: serializePrintSnapshot(layout.root).includes('data:image/png;base64,') };
    layout.cleanup();
    const pdf = await outputPDF({ element: root, settings: DEFAULT_SETTINGS, ruleConfig, filename: 'test', download: false });
    return { ...measured, exportedPages: pdf.pages, bytes: pdf.bytes, snapshots: document.querySelectorAll('[data-print-snapshot]').length };
  });
  expect(result).toMatchObject({ cloneMargin: '0px', sourceMargin: '24px auto', ignored: true,
    background: 'rgb(12, 34, 56)', padding: '20px', note: true, canvas: true, snapshots: 0 });
  expect(result.exportedPages).toBe(result.pages);
  expect(result.bytes).toBeGreaterThan(1000);
});

test('oversized atomic content fails clearly, frees its lock, and succeeds after correction', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { prepareLayout } = window.engine;
    const root = document.getElementById('fixture');
    root.style.width = '800px';
    root.innerHTML = '<div data-print-atomic="true" style="height:2000px">too tall</div>';
    let error = '';
    try { await prepareLayout({ element: root }); } catch (e) { error = e.message; }
    const cleaned = document.querySelectorAll('[data-print-snapshot]').length;
    root.firstElementChild.style.height = '100px';
    const layout = await prepareLayout({ element: root });
    const pages = layout.pages.length;
    layout.cleanup();
    return { error, cleaned, pages };
  });
  expect(result.error).toContain('超过正文可用高度');
  expect(result.cleaned).toBe(0);
  expect(result.pages).toBe(1);
});

test('aborting stuck resources cleans the snapshot and permits a subsequent export', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { prepareLayout } = window.engine;
    const root = document.getElementById('fixture');
    root.style.width = '800px';
    root.innerHTML = '<img src="stuck.png"><p>body</p>';
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = () => new Promise(() => {});
    const abort = new AbortController();
    const pending = prepareLayout({ element: root, signal: abort.signal });
    abort.abort();
    let error = '';
    try { await pending; } catch (e) { error = e.message; }
    finally { HTMLImageElement.prototype.decode = decode; }
    root.querySelector('img').remove();
    const layout = await prepareLayout({ element: root });
    layout.cleanup();
    return { error, remaining: document.querySelectorAll('[data-print-snapshot]').length };
  });
  expect(result.error).toContain('取消');
  expect(result.remaining).toBe(0);
});

test('declarative headers, footers, custom dimensions and top page numbers use shared geometry', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { prepareLayout, DEFAULT_SETTINGS, outputPDF } = window.engine;
    const root = document.getElementById('fixture');
    root.style.cssText = 'width:800px;padding:0;margin:0';
    root.innerHTML = '<p style="height:1400px">long document</p>';
    const settings = { ...DEFAULT_SETTINGS, paper: 'custom', widthMm: 160, heightMm: 220,
      header: { enabled: true, text: 'Company report' }, footer: { enabled: true, text: 'Confidential' },
      pageNumber: { enabled: true, position: 'top-center', format: 'chinese' } };
    const layout = await prepareLayout({ element: root, settings });
    const details = { header: layout.header.textContent, footer: layout.footer.textContent,
      headerEnd: layout.headerY + layout.headerHeight, numberY: layout.pageNumberY, bodyTop: layout.bodyTop,
      pages: layout.pages.length };
    layout.cleanup();
    const output = await outputPDF({ element: root, settings, download: false, filename: 'custom' });
    return { ...details, exportPages: output.pages, size: output.bytes };
  });
  expect(result.header).toBe('Company report');
  expect(result.footer).toBe('Confidential');
  expect(result.numberY - 9).toBeGreaterThanOrEqual(result.headerEnd);
  expect(result.numberY).toBeLessThan(result.bodyTop);
  expect(result.exportPages).toBe(result.pages);
  expect(result.size).toBeGreaterThan(1000);
});

test('late-loading images settle before their dimensions are frozen', async ({ page }) => {
  let resolveRequest;
  const requested = new Promise(resolve => { resolveRequest = resolve; });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/late-image.svg', async route => {
    resolveRequest();
    await gate;
    await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="navy"/></svg>' });
  });
  const pending = page.evaluate(async () => {
    const root = document.getElementById('fixture');
    root.style.cssText = 'width:800px;padding:0;margin:0';
    root.innerHTML = '<img src="/late-image.svg" style="display:block;width:100%;height:auto" alt="Late image">';
    const layout = await window.engine.prepareLayout({ element: root });
    const result = { imageHeight: layout.root.querySelector('img').getBoundingClientRect().height, pages: layout.pages.length };
    layout.cleanup();
    return result;
  });
  await requested;
  release();
  expect(await pending).toEqual({ imageHeight: 400, pages: 1 });
});
