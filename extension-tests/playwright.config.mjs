import { defineConfig } from '@playwright/test';
process.env.NO_PROXY = [process.env.NO_PROXY, 'localhost', '127.0.0.1', '::1']
  .filter(Boolean)
  .join(',');
process.env.no_proxy = process.env.NO_PROXY;
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.mjs',
  workers: 1,
  fullyParallel: false,
  timeout: 120000,
  expect: { timeout: 20000 },
  retries: 0,
  outputDir: '../extension-artifacts/test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: '../extension-artifacts/report', open: 'never' }],
  ],
  use: { trace: 'retain-on-failure' },
  webServer: {
    cwd: new URL('..', import.meta.url).pathname,
    command: 'node scripts/serve-extension-fixtures.mjs',
    url: 'http://127.0.0.1:4176/fixture',
    reuseExistingServer: !process.env.CI,
  },
});
