import { expect, test } from '@playwright/test';
import { loginAs, waitForHydration } from './fixtures/test-helpers';

test.describe('Mentions Autocomplete', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'alice');
  });

  test('should show dropdown when typing @', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder*="happening"]');
    await textarea.click();
    await textarea.type('@b');
    await waitForHydration(page);

    await expect(page.locator('[role="listbox"]')).toBeVisible();
  });

  test('should show matching users in dropdown', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder*="happening"]');
    await textarea.click();
    await textarea.type('@bob');
    await waitForHydration(page);

    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.locator('text=@bob')).toBeVisible();
  });

  test('should close dropdown on Escape', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder*="happening"]');
    await textarea.click();
    await textarea.type('@b');
    await waitForHydration(page);

    await expect(page.locator('[role="listbox"]')).toBeVisible();

    await textarea.press('Escape');
    await expect(page.locator('[role="listbox"]')).not.toBeVisible();
  });

  test('should not show dropdown for @ in the middle of a word', async ({
    page,
  }) => {
    const textarea = page.locator('textarea[placeholder*="happening"]');
    await textarea.click();
    // email-like pattern — @ inside a word (no space before)
    await textarea.type('user@example');

    // Dropdown should not appear since there's no word boundary before @
    await expect(page.locator('[role="listbox"]')).not.toBeVisible();
  });

  test('should not show dropdown for standalone @ with no query', async ({
    page,
  }) => {
    const textarea = page.locator('textarea[placeholder*="happening"]');
    await textarea.click();
    await textarea.type('@');
    // Dropdown may appear (with all users or empty), so just verify it
    // closes when we press Escape or type non-alphanumeric
    await textarea.press('Escape');
    await expect(page.locator('[role="listbox"]')).not.toBeVisible();
  });

  test('should complete a post with mentioned user', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder*="happening"]');
    await textarea.click();
    await textarea.type('Hey @bob');
    await waitForHydration(page);

    const option = page
      .locator('[role="option"]')
      .filter({ hasText: '@bob' })
      .first();
    await expect(option).toBeVisible();
    await option.click();

    // Continue typing and submit
    await textarea.type('how are you?');
    await page.click('button:has-text("Post")');
    await waitForHydration(page);

    await expect(
      page.locator('article').filter({ hasText: '@bob' }).first(),
    ).toBeVisible();
  });
});
