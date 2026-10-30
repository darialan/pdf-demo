import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';

const scenes = [
  ['长表格', 'print-content6'], ['长文章', 'print-content-long-article'],
  ['复杂图文页面', 'print-content-complex-mixed'], ['自定义页眉页脚', 'print-content-custom-header-footer'],
];

async function inspect(page) {
  await page.getByRole('button', { name: '检查分页', exact: true }).click();
  const preview = page.getByRole('region', { name: '纸张预览' });
  await expect(preview.locator('.mini-sheet-content').first()).toBeVisible();
  await expect(page.getByText(/纸张预览失败|页面标记失败/)).toHaveCount(0);
  return preview;
}
async function readPdf(download, expectedPages) {
  const task = getDocument({ data: new Uint8Array(await readFile(await download.path())), useSystemFonts: true });
  const pdf = await task.promise;
  expect(pdf.numPages).toBe(expectedPages);
  for (let index = 1; index <= pdf.numPages; index++) {
    const sheet = await pdf.getPage(index);
    const viewport = sheet.getViewport({ scale: 1 });
    expect(viewport.width).toBeCloseTo(595.28, 1);
    expect(viewport.height).toBeCloseTo(841.89, 1);
    const operators = await sheet.getOperatorList();
    expect(operators.fnArray.some(op => [OPS.paintImageXObject, OPS.paintInlineImageXObject].includes(op))).toBe(true);
    const imageIndex = operators.fnArray.findIndex(op => op === OPS.paintImageXObject);
    if (imageIndex >= 0) {
      const image = sheet.objs.get(operators.argsArray[imageIndex][0]);
      if (image?.data) {
        let dark = 0;
        const step = Math.max(4, Math.floor(image.data.length / 20000 / 4) * 4);
        for (let index = 0; index < image.data.length; index += step) if (image.data[index] < 220) dark++;
        expect(dark, 'the PDF body image must contain visible content').toBeGreaterThan(20);
      }
    }
    const text = await sheet.getTextContent();
    expect(text.items.map(item => item.str).join(' ')).toContain(`${index} / ${pdf.numPages}`);
    sheet.cleanup();
  }
  await task.destroy();
}

for (const [label, id] of scenes) {
  test(`${label}: inspection preserves layout and exported PDF matches the preview`, async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/#/playground');
    await page.getByRole('tab', { name: label, exact: true }).click();
    await expect(page.getByRole('button', { name: '导出 PDF', exact: true })).toBeEnabled();
    const root = page.locator(`#${id}`);
    if (label === '复杂图文页面') await expect(root).toHaveAttribute('data-print-status', 'ready');
    const geometry = () => root.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const child = element.querySelector('h1, tr, p');
      const rect = child.getBoundingClientRect();
      return { width: bounds.width, height: bounds.height, childX: rect.x - bounds.x, childY: rect.y - bounds.y };
    });
    const before = await geometry();
    const preview = await inspect(page);
    expect(await geometry()).toEqual(before);
    await expect(page.locator('.observability-legend')).toContainText('atomic:');
    await expect(page.locator('.observability-legend')).toContainText('splittable:');
    await expect(page.locator('.observability-legend')).toContainText('page-break');
    expect(await page.locator('[data-pdf-debug]').allTextContents()).not.toEqual(expect.arrayContaining(['整行保护', '允许切分', '不打印']));
    const offsets = await preview.locator('.mini-sheet-content').first().evaluate(element => {
      const root = element.firstElementChild;
      const a = element.getBoundingClientRect(), b = root.getBoundingClientRect();
      return { x: b.x - a.x, y: b.y - a.y, margin: getComputedStyle(root).marginLeft };
    });
    expect(offsets).toEqual({ x: 0, y: 0, margin: '0px' });
    const count = await preview.locator('.mini-sheet-container').count();
    const [download] = await Promise.all([
      page.waitForEvent('download'), page.getByRole('button', { name: '导出 PDF', exact: true }).click(),
    ]);
    await readPdf(download, count);
    await expect(page.locator('[data-pdf-snapshot]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '导出 PDF', exact: true })).toBeEnabled();
    await page.screenshot({ path: testInfo.outputPath('inspection.png') });
    expect(errors).toEqual([]);
  });
}

test('article load failure blocks partial exports and offers a working retry', async ({ page }) => {
  let attempts = 0;
  await page.route('**/demo-assets/torchoptics-article.html', route => {
    if (++attempts === 1) return route.fulfill({ status: 503, body: 'Unavailable' });
    return route.continue();
  });
  await page.goto('/#/playground?scene=complex-mixed');
  await expect(page.getByText('文章加载失败，请检查网络后重试。')).toBeVisible();
  await expect(page.getByRole('button', { name: '导出 PDF', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '检查分页', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '重试加载' }).click();
  await expect(page.locator('#print-content-complex-mixed')).toHaveAttribute('data-print-status', 'ready');
  await expect(page.getByRole('button', { name: '导出 PDF', exact: true })).toBeEnabled();
  await inspect(page);
});

test('inspection can close, reopen, and cancel pending previews across scene switches', async ({ page }) => {
  await page.goto('/#/playground?scene=long-article');
  await inspect(page);
  await page.getByRole('button', { name: '关闭预览小窗' }).click();
  await expect(page.locator('[data-pdf-debug]').first()).toBeVisible();
  await page.getByRole('button', { name: '打开预览', exact: true }).click();
  await expect(page.locator('.mini-sheet-content').first()).toBeVisible();
  await page.getByRole('tab', { name: '长表格', exact: true }).click();
  await expect(page.getByRole('region', { name: '纸张预览' })).toHaveCount(0);
  await expect(page.locator('[data-pdf-debug]')).toHaveCount(0);
  await page.getByRole('button', { name: '检查分页', exact: true }).click();
  await page.getByRole('button', { name: '退出检查', exact: true }).click();
  await expect(page.locator('[data-pdf-snapshot]')).toHaveCount(0);
  await expect(page.getByRole('region', { name: '纸张预览' })).toHaveCount(0);
});

for (const width of [390, 768]) {
  test(`controls and fullscreen preview fit a ${width}px viewport and support keyboard escape`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/#/playground?scene=long-article');
    for (const name of ['检查分页', '输出设置', '导出 PDF']) {
      const rect = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(width);
    }
    await inspect(page);
    await page.getByRole('button', { name: '全屏预览', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '纸张预览' });
    await expect(dialog).toBeVisible();
    const sheet = await dialog.locator('.mini-page-sheet').first().boundingBox();
    expect(sheet.x).toBeGreaterThanOrEqual(0);
    expect(sheet.x + sheet.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath('fullscreen.png') });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
}

test('invalid settings stay open with an actionable error and preserve applied settings', async ({ page }) => {
  await page.goto('/#/playground');
  await page.getByRole('button', { name: '输出设置', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '输出设置' });
  await dialog.getByLabel('左边距（mm）').fill('400');
  await dialog.getByRole('button', { name: '应 用' }).click();
  await expect(dialog.getByText('页边距占满了页面，请减小边距')).toBeVisible();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '取 消' }).click();
  await inspect(page);
});

test('dark shell keeps document text readable on the same white paper as the PDF', async ({ page }) => {
  await page.goto('/#/playground?scene=long-article');
  await page.getByRole('button', { name: '切换到暗色主题' }).click();
  const reading = page.locator('#print-content-long-article');
  const colors = await reading.evaluate(root => ({
    ink: getComputedStyle(root.querySelector('h1')).color,
    surface: getComputedStyle(root.closest('.print-scene-content')).backgroundColor,
    sourceBackground: getComputedStyle(root).backgroundColor,
  }));
  expect(colors).toEqual({ ink: 'rgb(32, 36, 42)', surface: 'rgb(255, 255, 255)', sourceBackground: 'rgba(0, 0, 0, 0)' });
  await inspect(page);
  await page.getByRole('button', { name: '切换到亮色主题' }).click();
  await expect(page.getByRole('button', { name: '切换到暗色主题' })).toBeVisible();
});

for (const [label] of scenes) {
  test(`${label}: PNG export downloads decodable numbered paper pages matching preview`, async ({ page }, testInfo) => {
    await page.goto('/#/playground');
    await page.getByRole('tab', { name: label, exact: true }).click();
    await expect(page.getByRole('button', { name: '导出 PDF', exact: true })).toBeEnabled();
    const preview = await inspect(page);
    const count = await preview.locator('.mini-sheet-container').count();
    await page.getByRole('button', { name: '选择导出格式', exact: true }).click();
    await page.getByRole('menuitem', { name: 'PNG 分页图片', exact: true }).click();
    await expect(preview).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '导出图片', exact: true }).click()]);
    expect(download.suggestedFilename()).toMatch(/-pages\.zip$/);
    const zip = await readFile(await download.path());
    let offset = 0, index = 0;
    const dimensions = [];
    while (zip.readUInt32LE(offset) === 0x04034b50) {
      const size = zip.readUInt32LE(offset + 18), nameLength = zip.readUInt16LE(offset + 26);
      const name = zip.subarray(offset + 30, offset + 30 + nameLength).toString();
      expect(name).toBe(`page-${String(++index).padStart(3, '0')}.png`);
      const start = offset + 30 + nameLength + zip.readUInt16LE(offset + 28);
      const png = zip.subarray(start, start + size);
      expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      const decoded = await page.evaluate(async base64 => {
        const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
        let ink = 0;
        for (let i = 0; i < pixels.length; i += 4) if (pixels[i] < 220 && pixels[i + 3] > 0) ink++;
        return { width: image.width, height: image.height, ink };
      }, png.toString('base64'));
      expect(decoded.ink).toBeGreaterThan(100);
      expect(decoded.width / decoded.height).toBeCloseTo(210 / 297, 2);
      dimensions.push([decoded.width, decoded.height]);
      offset = start + size;
    }
    expect(index).toBe(count);
    expect(dimensions.every(size => size[0] === dimensions[0][0] && size[1] === dimensions[0][1])).toBe(true);
    await expect(page.locator('[data-pdf-snapshot]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '导出图片', exact: true })).toBeEnabled();
    await page.screenshot({ path: testInfo.outputPath('png-export.png') });
    await page.getByRole('button', { name: '选择导出格式', exact: true }).click();
    await page.getByRole('menuitem', { name: 'PDF 文档', exact: true }).click();
    await expect(page.getByRole('button', { name: '导出 PDF', exact: true })).toBeEnabled();
  });
}

test('compact export menu switches format without exporting and supports keyboard dismissal on mobile', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/playground?scene=long-article');
  let downloads = 0;
  page.on('download', () => downloads++);
  await expect(page.getByRole('combobox', { name: '输出格式' })).toHaveCount(0);
  const toggle = page.getByRole('button', { name: '选择导出格式', exact: true });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).not.toBeVisible();
  await toggle.click();
  await page.getByRole('menuitem', { name: 'PNG 分页图片', exact: true }).click();
  await expect(page.getByRole('button', { name: '导出图片', exact: true })).toBeEnabled();
  expect(downloads).toBe(0);
  const controls = page.locator('.print-toolbar-actions');
  const rect = await controls.boundingBox();
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.width).toBeLessThanOrEqual(390);
  expect(rect.height).toBeLessThanOrEqual(44);
  await toggle.click();
  const menu = await page.getByRole('menu').boundingBox();
  expect(menu.x).toBeGreaterThanOrEqual(0);
  expect(menu.x + menu.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath('mobile-export-menu.png') });
  await page.keyboard.press('Escape');
});
