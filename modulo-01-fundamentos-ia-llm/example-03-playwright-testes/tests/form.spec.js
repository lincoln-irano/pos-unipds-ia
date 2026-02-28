const { test, expect } = require('@playwright/test');

test.describe('Add item form', () => {
  test('submitting the form appends a new item', async ({ page }) => {
    await page.goto('/vanilla-js-web-app-example/');

    const imgLocator = page.locator('img');
    const before = await imgLocator.count();

    // Fill the two inputs (assume they are the first two inputs on the page)
    await page.locator('input').nth(0).fill('Playwright Test Item');
    await page.locator('input').nth(1).fill('https://via.placeholder.com/150');

    // Click the submit control (try input[type=submit] or a button)
    const form = page.locator('form').first();
    await form.evaluate(f => (f.requestSubmit ? f.requestSubmit() : f.submit()));

    // Expect one more image and the new title to be visible
    await expect(imgLocator).toHaveCount(before + 1);
    await expect(page.getByText('Playwright Test Item')).toBeVisible();
  });

  test('form validation: empty title or invalid URL does not add item', async ({ page }) => {
    await page.goto('/vanilla-js-web-app-example/');

    const imgLocator = page.locator('img');
    const before = await imgLocator.count();

    // Try submitting with empty title
    await page.locator('input').nth(0).fill('');
    await page.locator('input').nth(1).fill('https://via.placeholder.com/150');
    const form2 = page.locator('form').first();
    await form2.evaluate(f => (f.requestSubmit ? f.requestSubmit() : f.submit()));

    // Expect no new image added
    await expect(imgLocator).toHaveCount(before);

    // Try submitting with invalid URL
    await page.locator('input').nth(0).fill('Invalid URL Item');
    await page.locator('input').nth(1).fill('not-a-url');
    const form3 = page.locator('form').first();
    await form3.evaluate(f => (f.requestSubmit ? f.requestSubmit() : f.submit()));

    // Still expect no new image added (client should validate URL)
    await expect(imgLocator).toHaveCount(before);
    await expect(page.getByText('Invalid URL Item')).toHaveCount(0);
  });
});
