import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  outputDir: './output/playwright/artifacts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['html', { outputFolder: './output/playwright/report', open: 'never' }], ['github']]
    : [['list'], ['html', { outputFolder: './output/playwright/report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:15173/dash',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node ./scripts/e2e-api.mjs',
      url: 'http://127.0.0.1:18080/api/health',
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: 'node ./scripts/e2e-web.mjs',
      url: 'http://127.0.0.1:15173/dash/login',
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
})
