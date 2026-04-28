import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RechirpButton } from "../../../src/components/posts/RechirpButton";

vi.mock("../../../src/server/functions/rechirps", () => ({
	getRechirpStatus: vi.fn().mockResolvedValue({ rechirped: false, count: 2 }),
	toggleRechirp: vi.fn().mockResolvedValue({ success: true, rechirped: true, count: 3 }),
}));

describe("RechirpButton", () => {
	it("renders a button", () => {
		render(<RechirpButton postId="post1" />);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("loads and displays rechirp count from server on mount", async () => {
		render(<RechirpButton postId="post1" />);
		await waitFor(() => {
			expect(screen.getByText("2")).toBeInTheDocument();
		});
	});

	it("shows Rechirp title when not rechirped", async () => {
		render(<RechirpButton postId="post1" />);
		await waitFor(() => {
			expect(screen.getByTitle("Rechirp")).toBeInTheDocument();
		});
	});

	it("is disabled with correct title when isOwnPost is true", () => {
		render(<RechirpButton postId="post1" disabled />);
		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("title", "Cannot rechirp your own post");
	});

	it("calls toggleRechirp and updates to rechirped state on click", async () => {
		const { toggleRechirp } = await import("../../../src/server/functions/rechirps");
		const user = userEvent.setup();

		render(<RechirpButton postId="post1" />);

		// Wait for initial status to load
		await waitFor(() => expect(screen.getByTitle("Rechirp")).toBeInTheDocument());

		await user.click(screen.getByRole("button"));

		expect(toggleRechirp).toHaveBeenCalledWith({ data: "post1" });
		await waitFor(() => {
			expect(screen.getByTitle("Undo rechirp")).toBeInTheDocument();
		});
	});

	it("shows updated count after rechirping", async () => {
		const user = userEvent.setup();

		render(<RechirpButton postId="post1" />);
		await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument());

		await user.click(screen.getByRole("button"));

		await waitFor(() => {
			expect(screen.getByText("3")).toBeInTheDocument();
		});
	});

	it("calls toggleRechirp and updates to un-rechirped state on second click", async () => {
		const { toggleRechirp } = await import("../../../src/server/functions/rechirps");
		vi.mocked(toggleRechirp)
			.mockResolvedValueOnce({ success: true, rechirped: true, count: 3 })
			.mockResolvedValueOnce({ success: true, rechirped: false, count: 2 });

		const user = userEvent.setup();
		render(<RechirpButton postId="post1" />);

		await waitFor(() => expect(screen.getByTitle("Rechirp")).toBeInTheDocument());

		// Rechirp
		await user.click(screen.getByRole("button"));
		await waitFor(() => expect(screen.getByTitle("Undo rechirp")).toBeInTheDocument());

		// Undo
		await user.click(screen.getByRole("button"));
		await waitFor(() => expect(screen.getByTitle("Rechirp")).toBeInTheDocument());
	});

	it("does not call toggleRechirp when disabled", async () => {
		const { toggleRechirp } = await import("../../../src/server/functions/rechirps");
		vi.mocked(toggleRechirp).mockClear();

		const user = userEvent.setup();
		render(<RechirpButton postId="post1" disabled />);

		await user.click(screen.getByRole("button"));

		expect(toggleRechirp).not.toHaveBeenCalled();
	});

	it("displays initialCount before server response arrives", () => {
		render(<RechirpButton postId="post1" initialCount={7} />);
		// The count shows initialCount synchronously before loadStatus resolves
		expect(screen.getByText("7")).toBeInTheDocument();
	});
});
