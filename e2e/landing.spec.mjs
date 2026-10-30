import { test, expect } from '@playwright/test';

test('landing installs the package, demonstrates real responsive pagination and exposes shared output APIs', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.copiedText = text; } } }));
  await page.goto('/#/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('长网页，分好每一页。');
  await expect(page.getByRole('navigation', { name: '全局导航' }).getByRole('link', { name: '打开工作台' })).toHaveAttribute('href', '#/playground');
  await expect(page.getByRole('link', { name: 'GitHub Star', exact: true })).toHaveAttribute('href', 'https://github.com/darialan/web-pdf-printer');
  await page.getByRole('button', { name: '复制安装命令', exact: true }).click();
  expect(await page.evaluate(() => window.copiedText)).toBe('npm install @darialan/web-printer');
  await expect(page.locator('.command-block pre > code')).toHaveCount(2);
  const fragment = page.locator('.pagination-demo');
  await expect(fragment.locator('[role=status]')).toHaveText(/\d+ 页 · 同一份 HTML/);
  const initial = await fragment.locator('[role=status]').textContent();
  await expect(fragment.locator('.landing-sheet')).toHaveCount(2);
  await page.getByLabel('页面尺寸', { exact: true }).selectOption('square');
  await expect(fragment.locator('[role=status]')).toHaveText(/\d+ 页 · 同一份 HTML/);
  await expect(fragment.locator('[role=status]')).not.toHaveText(initial);
  const sheet = await fragment.locator('.landing-sheet').first().boundingBox();
  expect(sheet.width / sheet.height).toBeCloseTo(1, 2);
  await fragment.getByRole('button', { name: '下一页', exact: true }).click();
  await expect(fragment.locator('.pagination-pager')).toContainText('第 2 页起');
  await expect(page.locator('[data-print-snapshot]')).toHaveCount(0);
  await expect(page.locator('.scene-link')).toHaveCount(4);
  for (const image of await page.locator('.scene-link img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  await expect(page.getByRole('tabpanel')).toContainText('outputDocument');
  await expect(page.getByRole('tabpanel')).toContainText("format: 'pdf'");
  await page.getByRole('tab', { name: 'JavaScript' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'React' })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText("format: 'png'");
  await page.getByRole('button', { name: '复制代码', exact: true }).click();
  const copiedCode = await page.evaluate(() => window.copiedText);
  expect(copiedCode).toMatch(/^import \{ useRef, useState \}/);
  expect(copiedCode).toContain("format: 'png'");
  await page.getByText('支持哪些前端框架？', { exact: true }).click();
  const inline = page.locator('.faq-list code').filter({ hasText: 'outputDocument' });
  await expect(inline).toBeVisible();
  expect(await inline.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  expect(errors).toEqual([]);
});

for (const width of [1440, 768, 390]) {
  test(`landing at ${width}px keeps actions, examples and both themes usable`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/#/');
    await expect(page.locator('.landing-sheet').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.getByRole('button', { name: '复制安装命令' })).toBeVisible();
    const command = page.locator('.command-block').first();
    const commandBounds = await command.boundingBox();
    expect(commandBounds.x + commandBounds.width).toBeLessThanOrEqual(width);
    expect(await command.locator('pre').evaluate(el => getComputedStyle(el).whiteSpace)).toBe('pre');
    await command.screenshot({ path: testInfo.outputPath('install-command.png') });
    await page.locator('.quickstart-example').screenshot({ path: testInfo.outputPath('code-example.png') });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('landing-light.png'), fullPage: true });
    if (width === 1440) await page.screenshot({ path: testInfo.outputPath('landing-fold.png') });
    await page.getByRole('button', { name: '切换到暗色主题' }).click();
    await expect(page.getByRole('button', { name: '切换到亮色主题' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath('landing-dark.png'), fullPage: true });
    await page.locator('.quickstart-example').screenshot({ path: testInfo.outputPath('code-example-dark.png') });
    await page.getByRole('button', { name: '切换到亮色主题' }).click();
  });
}
