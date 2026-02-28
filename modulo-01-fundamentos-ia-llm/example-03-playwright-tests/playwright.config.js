const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  timeout: 5000,
  expect: { timeout: 5000 },
  use: {
    baseURL: 'https://erickwendel.github.io',
    actionTimeout: 5000,
    navigationTimeout: 5000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  reporter: [['list'], ['html', { open: 'never' }]]
});
