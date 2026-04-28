import { expect, test } from '@playwright/test';
import { loginAs, waitForHydration } from './fixtures/test-helpers';

test.describe('Infinite Scroll', () => {
  test.describe('Home Feed', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'alice');
    });

    test('should load initial posts on page load', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await waitForHydration(page);

      // At least one post should be visible after initial load
      const posts = page.locator('article');
      await expect(posts.first()).toBeVisible();
    });

    test('should show infinite scroll sentinel at the bottom of the feed', async ({
      page,
    }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await waitForHydration(page);

      // The sentinel div must be rendered so IntersectionObserver can observe it
      const sentinel = page.locator('[data-testid="infinite-scroll-sentinel"]');
      await expect(sentinel).toBeAttached();
    });

    test('should load more posts when scrolled to the bottom', async ({
      page,
    }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await waitForHydration(page);

      const initialCount = await page.locator('article').count();

      // Scroll to the bottom to trigger IntersectionObserver
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await waitForHydration(page);

      const updatedCount = await page.locator('article').count();

      // If there are more posts available, the count must increase;
      // otherwise "all caught up" must be visible.
      const allCaughtUp = page.locator('[data-testid="all-caught-up"]');
      const moreLoaded = updatedCount > initialCount;
      const caughtUp = await allCaughtUp.isVisible();

      expect(moreLoaded || caughtUp).toBe(true);
    });

    test('should show all-caught-up message after last page loads', async ({
      page,
    }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await waitForHydration(page);

      // Keep scrolling to the bottom until no more posts load
      let previousCount = -1;
      let currentCount = await page.locator('article').count();
      while (currentCount > previousCount) {
        previousCount = currentCount;
        await page.evaluate(() =>
          window.scrollTo(0, document.body.scrollHeight),
        );
        await waitForHydration(page);
        currentCount = await page.locator('article').count();
      }

      // After exhausting all pages the "all caught up" message must appear
      await expect(page.locator('[data-testid="all-caught-up"]')).toBeVisible();
    });
  });

  test.describe('Explore Feed', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'alice');
    });

    test('should load initial posts on explore page', async ({ page }) => {
      await page.goto('/explore', { waitUntil: 'networkidle' });
      await waitForHydration(page);

      const posts = page.locator('article');
      await expect(posts.first()).toBeVisible();
    });

    test('should show infinite scroll sentinel on explore feed', async ({
      page,
    }) => {
      await page.goto('/explore', { waitUntil: 'networkidle' });
      await waitForHydration(page);

      const sentinel = page.locator('[data-testid="infinite-scroll-sentinel"]');
      await expect(sentinel).toBeAttached();
    });

    test('should load more posts when scrolled to the bottom on explore', async ({
      page,
    }) => {
      await page.goto('/explore', { waitUntil: 'networkidle' });
      await waitForHydration(page);

      const initialCount = await page.locator('article').count();

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await waitForHydration(page);

      const updatedCount = await page.locator('article').count();
      const allCaughtUp = page.locator('[data-testid="all-caught-up"]');
      const moreLoaded = updatedCount > initialCount;
      const caughtUp = await allCaughtUp.isVisible();

      expect(moreLoaded || caughtUp).toBe(true);
    });
  });

  test.describe('Scroll position restoration', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'alice');
    });

    test('should restore scroll position after navigating to a post and back', async ({
      page,
    }) => {
      await page.goto('/explore', { waitUntil: 'networkidle' });
      await waitForHydration(page);

      // Scroll down so the page has a non-zero scroll offset
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await waitForHydration(page);

      const scrollBefore = await page.evaluate(() => window.scrollY);

      // Navigate to the first post detail page
      const firstPostLink = page
        .locator('article')
        .first()
        .locator('a[href*="/posts/"]')
        .first();
      await firstPostLink.click();
      await waitForHydration(page);
      await expect(page).toHaveURL(/\/posts\//);

      // Navigate back using the browser history
      await page.goBack({ waitUntil: 'networkidle' });
      await waitForHydration(page);
      await expect(page).toHaveURL('/explore');

      // Posts must still be visible after back-navigation
      await expect(page.locator('article').first()).toBeVisible();

      // Scroll position should be roughly where we left it (within 50px tolerance)
      const scrollAfter = await page.evaluate(() => window.scrollY);
      expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(50);
    });

    test('should restore scroll position on home feed after navigating to a post and back', async ({
      page,
    }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await waitForHydration(page);

      // Ensure there is content to scroll past
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await waitForHydration(page);

      const scrollBefore = await page.evaluate(() => window.scrollY);
      // Only meaningful if the page actually scrolled (i.e. content overflows)
      if (scrollBefore === 0) {
        test.skip();
      }

      const firstPostLink = page
        .locator('article')
        .first()
        .locator('a[href*="/posts/"]')
        .first();
      await firstPostLink.click();
      await waitForHydration(page);
      await expect(page).toHaveURL(/\/posts\//);

      await page.goBack({ waitUntil: 'networkidle' });
      await waitForHydration(page);
      await expect(page).toHaveURL('/');

      await expect(page.locator('article').first()).toBeVisible();

      const scrollAfter = await page.evaluate(() => window.scrollY);
      expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(50);
    });
  });
});
