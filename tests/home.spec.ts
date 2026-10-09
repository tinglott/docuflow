import { test, expect } from '@playwright/test';

test.describe('DocuFlow home', () => {
  test('loads the hero and library', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Turn PDFs into/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Create a flipbook/i }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Recent flipbooks/i })).toBeVisible();
  });

  test('navigates to login and upload pages', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /Sign in/i }).first()).toBeVisible();

    await page.goto('/upload');
    await expect(page.getByRole('heading', { name: /Create a flipbook/i })).toBeVisible();
    await expect(page.getByText(/Drop your PDF here/i)).toBeVisible();
  });

  test('unknown slug shows the 404 page', async ({ page }) => {
    const res = await page.goto('/d/this-slug-does-not-exist-12345');
    expect(res?.status()).toBe(404);
  });
});
