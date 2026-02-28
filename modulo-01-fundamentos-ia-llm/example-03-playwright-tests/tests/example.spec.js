const { test, expect } = require('@playwright/test');

test('homepage loads and has expected content', async ({ page }) => {
  await page.goto('/vanilla-js-web-app-example/');
  const title = await page.title();
  expect(title).not.toBe('');

  // Check for known content / elements on the page
  const aiAlienCount = await page.locator('text=AI Alien').count();
  expect(aiAlienCount).toBeGreaterThan(0);

  const imgCount = await page.locator('img').count();
  expect(imgCount).toBeGreaterThan(0);
});
