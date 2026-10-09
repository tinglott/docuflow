import { test, expect } from '@playwright/test';

/**
 * Viewer tests. These run against a seeded flipbook: set PLAYWRIGHT_TEST_SLUG
 * to the slug of a public flipbook in your dev Supabase project.
 * They are skipped when the env var is absent (e.g. in CI without a seed).
 */
const slug = process.env.PLAYWRIGHT_TEST_SLUG;
const describeOrSkip = slug ? test.describe : test.describe.skip;

describeOrSkip('DocuFlow viewer', () => {
  test('renders the flipbook and toolbar', async ({ page }) => {
    await page.goto(`/d/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Toolbar
    await expect(page.getByRole('button', { name: /Next page/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Previous page/i })).toBeVisible();
    await expect(page.getByLabel(/Page number/i)).toBeVisible();
    // Deep-link hint
    await expect(page.getByText(/#page=N/i)).toBeVisible();
  });

  test('deep link #page=2 opens on page 2', async ({ page }) => {
    await page.goto(`/d/${slug}#page=2`);
    const input = page.getByLabel(/Page number/i);
    await expect(input).toBeVisible();
    // The book turns to page 2 shortly after load.
    await expect
      .poll(async () => Number(await input.inputValue()), { timeout: 10_000 })
      .toBe(2);
  });

  test('records a view event without breaking the viewer', async ({ page }) => {
    let tracked = false;
    await page.route('/api/track', async (route) => {
      const body = route.request().postDataJSON() as { type?: string };
      if (body?.type === 'view') tracked = true;
      await route.fulfill({ status: 200, body: '{}' });
    });
    await page.goto(`/d/${slug}`);
    await page.waitForTimeout(1500);
    expect(tracked).toBe(true);
  });
});
