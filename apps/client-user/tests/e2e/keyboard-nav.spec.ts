import { expect, test } from "@playwright/test";
import { loginAs, waitForHydration } from "./fixtures/test-helpers";

test.describe("Keyboard Navigation", () => {
	test.beforeEach(async ({ page }) => {
		await loginAs(page, "alice");
		// Home feed should have posts
		await expect(page.locator("article[data-post-id]").first()).toBeVisible({ timeout: 10000 });
	});

	test("j focuses the first post", async ({ page }) => {
		await page.keyboard.press("j");
		const focused = page.locator("article[data-keyboard-focused]");
		await expect(focused).toBeVisible();
	});

	test("j/k navigate between posts", async ({ page }) => {
		await page.keyboard.press("j");
		const firstFocused = await page
			.locator("article[data-keyboard-focused]")
			.getAttribute("data-post-id");

		await page.keyboard.press("j");
		const secondFocused = await page
			.locator("article[data-keyboard-focused]")
			.getAttribute("data-post-id");

		expect(secondFocused).not.toBe(firstFocused);

		// k goes back to the first
		await page.keyboard.press("k");
		const backToFirst = await page
			.locator("article[data-keyboard-focused]")
			.getAttribute("data-post-id");
		expect(backToFirst).toBe(firstFocused);
	});

	test("ArrowDown/ArrowUp also navigate posts", async ({ page }) => {
		await page.keyboard.press("ArrowDown");
		await expect(page.locator("article[data-keyboard-focused]")).toBeVisible();

		const first = await page
			.locator("article[data-keyboard-focused]")
			.getAttribute("data-post-id");

		await page.keyboard.press("ArrowDown");
		const second = await page
			.locator("article[data-keyboard-focused]")
			.getAttribute("data-post-id");

		expect(second).not.toBe(first);

		await page.keyboard.press("ArrowUp");
		const back = await page
			.locator("article[data-keyboard-focused]")
			.getAttribute("data-post-id");
		expect(back).toBe(first);
	});

	test("Escape clears keyboard focus", async ({ page }) => {
		await page.keyboard.press("j");
		await expect(page.locator("article[data-keyboard-focused]")).toBeVisible();

		await page.keyboard.press("Escape");
		await expect(page.locator("article[data-keyboard-focused]")).not.toBeVisible();
	});

	test("? opens the keyboard help overlay", async ({ page }) => {
		await page.keyboard.press("?");
		await expect(page.locator('[role="dialog"][aria-label="Keyboard shortcuts"]')).toBeVisible();
	});

	test("Escape closes the help overlay", async ({ page }) => {
		await page.keyboard.press("?");
		await expect(page.locator('[role="dialog"]')).toBeVisible();

		await page.keyboard.press("Escape");
		await expect(page.locator('[role="dialog"]')).not.toBeVisible();
	});

	test("clicking backdrop closes the help overlay", async ({ page }) => {
		await page.keyboard.press("?");
		await expect(page.locator('[role="dialog"]')).toBeVisible();

		// Click the backdrop (outside the panel)
		await page.mouse.click(10, 10);
		await expect(page.locator('[role="dialog"]')).not.toBeVisible();
	});

	test("Enter opens the focused post", async ({ page }) => {
		await page.keyboard.press("j");
		const postId = await page
			.locator("article[data-keyboard-focused]")
			.getAttribute("data-post-id");

		await page.keyboard.press("Enter");
		await waitForHydration(page);

		await expect(page).toHaveURL(`/posts/${postId}`);
	});

	test("o opens the focused post", async ({ page }) => {
		await page.keyboard.press("j");
		const postId = await page
			.locator("article[data-keyboard-focused]")
			.getAttribute("data-post-id");

		await page.keyboard.press("o");
		await waitForHydration(page);

		await expect(page).toHaveURL(`/posts/${postId}`);
	});

	test("shortcuts are suppressed while typing in post form", async ({ page }) => {
		const textarea = page.locator('textarea[placeholder*="happening"]');
		await textarea.click();
		await textarea.type("j");

		// j typed into textarea should not focus any post
		await expect(page.locator("article[data-keyboard-focused]")).not.toBeVisible();
		// and the character appears in the textarea
		await expect(textarea).toHaveValue("j");
	});

	test("shortcuts are suppressed while typing in search", async ({ page }) => {
		const searchInput = page.locator('input[placeholder*="search" i]').first();
		if (await searchInput.isVisible()) {
			await searchInput.click();
			await searchInput.type("j");
			await expect(page.locator("article[data-keyboard-focused]")).not.toBeVisible();
		}
	});

	test("k does nothing when no post is focused yet", async ({ page }) => {
		// Pressing k with nothing focused should focus the first post (clamped at 0)
		await page.keyboard.press("k");
		await expect(page.locator("article[data-keyboard-focused]")).toBeVisible();
	});

	test("focused post has visible focus ring", async ({ page }) => {
		await page.keyboard.press("j");
		const focused = page.locator("article[data-keyboard-focused]");
		await expect(focused).toBeVisible();

		const outline = await focused.evaluate((el) => window.getComputedStyle(el).outline);
		expect(outline).toContain("rgb(99, 102, 241)");
	});
});
