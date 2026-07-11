import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  webServer: {
    command: 'npm run preview -- --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env['CI'],
  },
  use: { baseURL: 'http://localhost:4321' },
  projects: [
    { name: 'mobile-375', use: { viewport: { width: 375, height: 812 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
