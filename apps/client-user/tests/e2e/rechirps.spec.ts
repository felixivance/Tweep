import { expect, test } from '@playwright/test';
import {
  createPost,
  goToProfile,
  loginAs,
  waitForHydration,
} from './fixtures/test-helpers';

test.describe('Rechirps', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'alice');
  });

  test('should show rechirp button on every post', async ({ page }) => {
    // Navigate to Bob's profile to find posts Alice doesn't own
    await page.goto('/users/bob', { waitUntil: 'networkidle' });
    await waitForHydration(page);

    // Rechirp button should be visible on posts in the feed
    const rechirpButton = page.locator('button[title="Rechirp"]').first();
    await expect(rechirpButton).toBeVisible();
  });

  test('should rechirp a post', async ({ page }) => {
    // Navigate to Bob's profile to find a post Alice doesn't own
    await page.goto('/users/bob', { waitUntil: 'networkidle' });
    await waitForHydration(page);

    const rechirpButton = page.locator('button[title="Rechirp"]').first();
    await expect(rechirpButton).toBeVisible();

    await rechirpButton.click();
    await waitForHydration(page);

    // Button should change to "Undo rechirp"
    await expect(
      page.locator('button[title="Undo rechirp"]').first(),
    ).toBeVisible();
  });

  test('should undo a rechirp', async ({ page }) => {
    // Navigate to Bob's profile and rechirp a post
    await page.goto('/users/bob', { waitUntil: 'networkidle' });
    await waitForHydration(page);

    const rechirpButton = page.locator('button[title="Rechirp"]').first();
    await rechirpButton.click();
    await waitForHydration(page);

    // Undo the rechirp
    const undoButton = page.locator('button[title="Undo rechirp"]').first();
    await undoButton.click();
    await waitForHydration(page);

    // Button should revert to "Rechirp"
    await expect(page.locator('button[title="Rechirp"]').first()).toBeVisible();
  });

  test('should update rechirp count after rechirping', async ({ page }) => {
    await page.goto('/users/bob', { waitUntil: 'networkidle' });
    await waitForHydration(page);

    // Get the rechirp button and its initial count
    const rechirpButton = page.locator('button[title="Rechirp"]').first();
    const initialCount = Number.parseInt(
      (await rechirpButton.locator('span').textContent()) ?? '0',
    );

    await rechirpButton.click();
    await waitForHydration(page);

    // Count should increment by 1
    const updatedButton = page.locator('button[title="Undo rechirp"]').first();
    const newCount = Number.parseInt(
      (await updatedButton.locator('span').textContent()) ?? '0',
    );
    expect(newCount).toBe(initialCount + 1);
  });

  test('should show rechirp count decrement after undoing', async ({
    page,
  }) => {
    await page.goto('/users/bob', { waitUntil: 'networkidle' });
    await waitForHydration(page);

    // Rechirp first
    const rechirpButton = page.locator('button[title="Rechirp"]').first();
    await rechirpButton.click();
    await waitForHydration(page);

    const afterRechirpCount = Number.parseInt(
      (await page
        .locator('button[title="Undo rechirp"]')
        .first()
        .locator('span')
        .textContent()) ?? '0',
    );

    // Undo rechirp
    await page.locator('button[title="Undo rechirp"]').first().click();
    await waitForHydration(page);

    const afterUndoCount = Number.parseInt(
      (await page
        .locator('button[title="Rechirp"]')
        .first()
        .locator('span')
        .textContent()) ?? '0',
    );
    expect(afterUndoCount).toBe(afterRechirpCount - 1);
  });

  test('should not allow rechirping own posts', async ({ page }) => {
    // Create a post as Alice
    const postContent = `Alice own post ${Date.now()}`;
    await createPost(page, postContent);

    // Find Alice's own post
    const postArticle = page
      .locator('article')
      .filter({ hasText: postContent })
      .first();

    // The rechirp button on own posts should be disabled with the restriction title
    const ownPostRechirpButton = postArticle.locator(
      'button[title="Cannot rechirp your own post"]',
    );
    await expect(ownPostRechirpButton).toBeVisible();
    await expect(ownPostRechirpButton).toBeDisabled();
  });

  test('should show rechirped post on reposter profile', async ({ page }) => {
    // Navigate to Bob's profile and rechirp his first post
    await page.goto('/users/bob', { waitUntil: 'networkidle' });
    await waitForHydration(page);

    const rechirpButton = page.locator('button[title="Rechirp"]').first();
    await rechirpButton.click();
    await waitForHydration(page);

    // Navigate to Alice's profile (the reposter)
    await goToProfile(page, 'alice');

    // Alice's profile should show the rechirped post with a "rechirped" banner
    await expect(
      page.locator('article').filter({ hasText: 'rechirped' }).first(),
    ).toBeVisible();
  });

  test('should show original author on rechirped post in profile', async ({
    page,
  }) => {
    // Rechirp Bob's first post as Alice
    await page.goto('/users/bob', { waitUntil: 'networkidle' });
    await waitForHydration(page);

    // Grab the content of the first rechirpable post for verification
    const firstPost = page
      .locator('article')
      .filter({ has: page.locator('button[title="Rechirp"]') })
      .first();
    const postContent =
      (await firstPost.locator("a[href*='/posts/']").first().textContent()) ??
      '';

    await firstPost.locator('button[title="Rechirp"]').click();
    await waitForHydration(page);

    // Navigate to Alice's profile
    await goToProfile(page, 'alice');

    // The rechirped post should appear with Bob as the original author
    const rechirpedCard = page
      .locator('article')
      .filter({ hasText: 'rechirped' })
      .first();
    await expect(rechirpedCard).toBeVisible();
    await expect(rechirpedCard.getByText('@bob')).toBeVisible();
  });
});
