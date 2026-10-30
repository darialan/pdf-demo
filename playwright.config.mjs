import { defineConfig, devices } from '@playwright/test';
// Local readiness checks must bypass any developer/corporate HTTP proxy.
process.env.NO_PROXY = [process.env.NO_PROXY, 'localhost', '127.0.0.1', '::1'].filter(Boolean).join(',');
process.env.no_proxy = process.env.NO_PROXY;
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: process.env.CI ? 2 : 1,
  timeout: 90000, expect: { timeout: 15000 }, forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
  projects: [{ name: 'chromium' }],
  webServer: [
    { command: 'node scripts/serve-test-build.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
    { command: 'vite --host 127.0.0.1 --port 4174 --strictPort', url: 'http://127.0.0.1:4174/e2e/fixtures/engine.html', reuseExistingServer: !process.env.CI },
  ],
});
