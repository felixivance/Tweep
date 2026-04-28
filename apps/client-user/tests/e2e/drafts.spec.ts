import { expect, test } from '@playwright/test';
import { loginAs, uniqueId, waitForHydration } from './fixtures/test-helpers';

const TEXTAREA = 'textarea[placeholder*="happening"]';
const POST_BTN = 'button:has-text("Post")';

test.describe('Post Drafts', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'alice');
  });

  test('draft is preserved when navigating away and back', async ({ page }) => {
    // Type a partial post
    const draftText = `Draft test ${uniqueId()}`;
    await page.fill(TEXTAREA, draftText);

    // Navigate away to explore
    await page.goto('/explore', { waitUntil: 'networkidle' });
    await waitForHydration(page);

    // Navigate back to home
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForHydration(page);

    // Draft should be restored
    await expect(page.locator(TEXTAREA)).toHaveValue(draftText);
  });

  test('draft is preserved after navigating to a post detail and back', async ({
    page,
  }) => {
    const draftText = `Draft navigate ${uniqueId()}`;
    await page.fill(TEXTAREA, draftText);

    // Navigate to first visible post detail
    const firstPostLink = page
      .locator("article[data-post-id] a[href*='/posts/']")
      .first();
    await firstPostLink.click();
    await waitForHydration(page);

    // Go back to home
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForHydration(page);

    await expect(page.locator(TEXTAREA)).toHaveValue(draftText);
  });

  test('draft is cleared after posting', async ({ page }) => {
    const draftText = `Draft clear test ${uniqueId()}`;
    await page.fill(TEXTAREA, draftText);

    // Submit the post
    await page.click(POST_BTN);
    await waitForHydration(page);

    // Navigate away and back to check the draft is gone
    await page.goto('/explore', { waitUntil: 'networkidle' });
    await waitForHydration(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForHydration(page);

    // Textarea should be empty (draft cleared)
    await expect(page.locator(TEXTAREA)).toHaveValue('');
  });

  test('draft persists across multiple navigations in the same session', async ({
    page,
  }) => {
    const draftText = `Persistent draft ${uniqueId()}`;
    await page.fill(TEXTAREA, draftText);

    // Navigate through multiple pages
    await page.goto('/explore', { waitUntil: 'networkidle' });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.goto('/explore', { waitUntil: 'networkidle' });
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForHydration(page);

    await expect(page.locator(TEXTAREA)).toHaveValue(draftText);
  });
});

test.describe('Content Warnings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'alice');
  });

  test('CW toggle button is visible in the post form', async ({ page }) => {
    await expect(page.locator('[data-testid="cw-toggle"]')).toBeVisible();
  });

  test('CW field is hidden by default', async ({ page }) => {
    await expect(page.locator('[data-testid="cw-field"]')).not.toBeVisible();
  });

  test('clicking CW toggle shows the warning input field', async ({ page }) => {
    await page.click('[data-testid="cw-toggle"]');
    await expect(page.locator('[data-testid="cw-field"]')).toBeVisible();
    await expect(page.locator('[data-testid="cw-input"]')).toBeVisible();
  });

  test('clicking CW toggle again hides the warning field', async ({ page }) => {
    await page.click('[data-testid="cw-toggle"]');
    await expect(page.locator('[data-testid="cw-field"]')).toBeVisible();

    // Click the X button inside the CW field to close it
    await page.click('button[aria-label="Remove content warning"]');
    await expect(page.locator('[data-testid="cw-field"]')).not.toBeVisible();
  });

  test('CW draft is preserved on navigation', async ({ page }) => {
    const cwText = `Spoilers ahead ${uniqueId()}`;
    const bodyText = `Post body ${uniqueId()}`;

    await page.click('[data-testid="cw-toggle"]');
    await page.fill('[data-testid="cw-input"]', cwText);
    await page.fill(TEXTAREA, bodyText);

    // Navigate away and back
    await page.goto('/explore', { waitUntil: 'networkidle' });
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForHydration(page);

    // CW field and its content should be restored
    await expect(page.locator('[data-testid="cw-field"]')).toBeVisible();
    await expect(page.locator('[data-testid="cw-input"]')).toHaveValue(cwText);
    await expect(page.locator(TEXTAREA)).toHaveValue(bodyText);
  });

  test('post with content warning shows warning banner in feed', async ({
    page,
  }) => {
    const cwText = `Spoiler warning ${uniqueId()}`;
    const bodyText = `Hidden content ${uniqueId()}`;

    // Create a CW post
    await page.click('[data-testid="cw-toggle"]');
    await page.fill('[data-testid="cw-input"]', cwText);
    await page.fill(TEXTAREA, bodyText);
    await page.click(POST_BTN);
    await waitForHydration(page);

    // The CW banner should appear in the feed
    await expect(page.locator('[data-testid="cw-banner"]').first()).toBeVisible(
      {
        timeout: 8000,
      },
    );
    await expect(
      page
        .locator('[data-testid="cw-warning-text"]')
        .filter({ hasText: cwText })
        .first(),
    ).toBeVisible();
  });

  test('post content is hidden behind the CW by default', async ({ page }) => {
    const cwText = `Trigger warning ${uniqueId()}`;
    const bodyText = `Sensitive content body ${uniqueId()}`;

    await page.click('[data-testid="cw-toggle"]');
    await page.fill('[data-testid="cw-input"]', cwText);
    await page.fill(TEXTAREA, bodyText);
    await page.click(POST_BTN);
    await waitForHydration(page);

    // Find the CW post in the feed
    const cwBanner = page
      .locator('[data-testid="cw-banner"]')
      .filter({ has: page.locator(`text=${cwText}`) })
      .first();
    await expect(cwBanner).toBeVisible({ timeout: 8000 });

    // Content should not be visible (display:none via StyleX)
    const article = cwBanner.locator('..').locator('..').locator('..');
    const postContent = article.locator('[data-testid="post-content"]').first();
    await expect(postContent).not.toBeVisible();
  });

  test('clicking Show reveals the post content', async ({ page }) => {
    const cwText = `Click to reveal ${uniqueId()}`;
    const bodyText = `Now you can see me ${uniqueId()}`;

    await page.click('[data-testid="cw-toggle"]');
    await page.fill('[data-testid="cw-input"]', cwText);
    await page.fill(TEXTAREA, bodyText);
    await page.click(POST_BTN);
    await waitForHydration(page);

    // Find the reveal button for our post
    const revealBtn = page.locator('[data-testid="cw-reveal-btn"]').first();
    await expect(revealBtn).toBeVisible({ timeout: 8000 });
    await expect(revealBtn).toHaveText('Show');

    // Click Show
    await revealBtn.click();
    await expect(revealBtn).toHaveText('Hide');

    // Content should now be visible
    const cwBanner = page.locator('[data-testid="cw-banner"]').first();
    const article = cwBanner.locator('..').locator('..').locator('..');
    const postContent = article.locator('[data-testid="post-content"]').first();
    await expect(postContent).toBeVisible();
  });

  test('clicking Hide hides the post content again', async ({ page }) => {
    const cwText = `Toggle hide ${uniqueId()}`;
    const bodyText = `Toggleable content ${uniqueId()}`;

    await page.click('[data-testid="cw-toggle"]');
    await page.fill('[data-testid="cw-input"]', cwText);
    await page.fill(TEXTAREA, bodyText);
    await page.click(POST_BTN);
    await waitForHydration(page);

    const revealBtn = page.locator('[data-testid="cw-reveal-btn"]').first();
    await expect(revealBtn).toBeVisible({ timeout: 8000 });

    // Show then hide
    await revealBtn.click();
    await expect(revealBtn).toHaveText('Hide');

    await revealBtn.click();
    await expect(revealBtn).toHaveText('Show');

    const cwBanner = page.locator('[data-testid="cw-banner"]').first();
    const article = cwBanner.locator('..').locator('..').locator('..');
    const postContent = article.locator('[data-testid="post-content"]').first();
    await expect(postContent).not.toBeVisible();
  });

  test('posting with CW clears both the body and CW draft', async ({
    page,
  }) => {
    const cwText = `Draft cw clear ${uniqueId()}`;
    const bodyText = `Body draft clear ${uniqueId()}`;

    await page.click('[data-testid="cw-toggle"]');
    await page.fill('[data-testid="cw-input"]', cwText);
    await page.fill(TEXTAREA, bodyText);
    await page.click(POST_BTN);
    await waitForHydration(page);

    // Navigate away and back
    await page.goto('/explore', { waitUntil: 'networkidle' });
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForHydration(page);

    // Both should be cleared
    await expect(page.locator(TEXTAREA)).toHaveValue('');
    await expect(page.locator('[data-testid="cw-field"]')).not.toBeVisible();
  });
});
