import * as stylex from "@stylexjs/stylex";
import { AlertCircle, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPost } from "../../server/functions/posts";
import { searchUsers } from "../../server/functions/search";
import { colors, radii, semanticColors, spacing } from "../../tokens.stylex";
import { CharacterCount } from "../shared/CharacterCount";
import { MentionDropdown } from "./MentionDropdown";

const spin = stylex.keyframes({
	from: { transform: "rotate(0deg)" },
	to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
	form: {
		backgroundColor: semanticColors.surfaceCard,
		borderRadius: radii.xl,
		boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.03)",
		padding: spacing.lg,
	},
	errorBox: {
		marginBottom: spacing.md,
		padding: spacing.sm,
		backgroundColor: semanticColors.errorBg,
		color: semanticColors.error,
		borderRadius: radii.lg,
		fontSize: "0.8125rem",
		display: "flex",
		alignItems: "center",
		gap: spacing.sm,
		border: semanticColors.errorBorder,
	},
	errorIcon: {
		flexShrink: 0,
	},
	inputWrapper: {
		position: "relative",
		borderRadius: radii.lg,
		backgroundColor: semanticColors.surfaceInput,
		transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
	},
	inputWrapperFocused: {
		backgroundColor: semanticColors.surfaceCard,
		boxShadow: "0 0 0 2px rgba(99, 102, 241, 0.12)",
	},
	textarea: {
		width: "100%",
		padding: spacing.md,
		fontSize: "0.9375rem",
		backgroundColor: "transparent",
		resize: "none",
		border: "none",
		outline: "none",
		lineHeight: "1.6",
		"::placeholder": {
			color: semanticColors.textTertiary,
		},
	},
	footer: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: spacing.md,
	},
	submitButton: {
		display: "flex",
		alignItems: "center",
		gap: spacing.sm,
		paddingLeft: spacing.xl,
		paddingRight: spacing.xl,
		paddingTop: spacing.sm,
		paddingBottom: spacing.sm,
		backgroundImage: `linear-gradient(135deg, ${colors.indigo500}, ${colors.blue600})`,
		color: colors.white,
		borderRadius: radii.lg,
		fontWeight: 600,
		fontSize: "0.875rem",
		border: "none",
		cursor: "pointer",
		transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
		boxShadow: "0 4px 12px -2px rgba(99, 102, 241, 0.25)",
		":hover": {
			boxShadow: "0 6px 16px -2px rgba(99, 102, 241, 0.35)",
			transform: "translateY(-1px)",
		},
		":disabled": {
			opacity: 0.5,
			cursor: "not-allowed",
			boxShadow: "none",
			transform: "none",
		},
	},
	spinner: {
		width: "1rem",
		height: "1rem",
		borderWidth: "2px",
		borderStyle: "solid",
		borderColor: "rgba(255, 255, 255, 0.3)",
		borderTopColor: colors.white,
		borderRadius: radii.full,
		animationName: spin,
		animationDuration: "0.7s",
		animationIterationCount: "infinite",
		animationTimingFunction: "linear",
	},
});

interface MentionUser {
	id: string;
	username: string;
	displayName: string;
	avatarUrl?: string | null;
}

interface MentionState {
	open: boolean;
	users: MentionUser[];
	activeIndex: number;
	position: { top: number; left: number };
	triggerStart: number;
}

const MENTION_RE = /(^|\s)@([a-zA-Z0-9_]*)$/;

function getCaretCoords(
	textarea: HTMLTextAreaElement,
	caretPos: number,
): { top: number; left: number } {
	const mirror = document.createElement("div");
	const computed = window.getComputedStyle(textarea);

	mirror.style.cssText = [
		"position:absolute",
		"visibility:hidden",
		"overflow:hidden",
		"white-space:pre-wrap",
		"word-wrap:break-word",
		`width:${computed.width}`,
		`padding:${computed.padding}`,
		`font:${computed.font}`,
		`line-height:${computed.lineHeight}`,
		`border:${computed.border}`,
		`box-sizing:${computed.boxSizing}`,
	].join(";");

	const textBefore = textarea.value.substring(0, caretPos);
	mirror.textContent = textBefore;

	const caret = document.createElement("span");
	caret.textContent = "​";
	mirror.appendChild(caret);

	textarea.parentElement?.appendChild(mirror);
	const caretRect = caret.getBoundingClientRect();
	const wrapperRect = textarea.parentElement!.getBoundingClientRect();
	mirror.remove();

	return {
		top: caretRect.bottom - wrapperRect.top + 4,
		left: caretRect.left - wrapperRect.left,
	};
}

export function PostForm({ onSuccess }: { onSuccess?: () => void }) {
	const [content, setContent] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [isFocused, setIsFocused] = useState(false);
	const [mention, setMention] = useState<MentionState>({
		open: false,
		users: [],
		activeIndex: 0,
		position: { top: 0, left: 0 },
		triggerStart: 0,
	});

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const closeMention = useCallback(() => {
		setMention((m) => ({ ...m, open: false, users: [], activeIndex: 0 }));
	}, []);

	const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const value = e.target.value;
		setContent(value);

		const cursor = e.target.selectionStart ?? value.length;
		const textBeforeCursor = value.substring(0, cursor);
		const match = MENTION_RE.exec(textBeforeCursor);

		if (!match) {
			closeMention();
			return;
		}

		const query = match[2];
		const triggerStart = textBeforeCursor.lastIndexOf("@");
		const coords = getCaretCoords(e.target, triggerStart);

		setMention((m) => ({ ...m, open: true, triggerStart, position: coords, activeIndex: 0 }));

		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(async () => {
			try {
				const users = await searchUsers({ data: query });
				setMention((m) => (m.open ? { ...m, users } : m));
			} catch {
				// silently ignore
			}
		}, 200);
	};

	const selectUser = useCallback(
		(user: MentionUser) => {
			const textarea = textareaRef.current;
			if (!textarea) return;

			const cursor = textarea.selectionStart ?? content.length;
			const before = content.substring(0, mention.triggerStart);
			const after = content.substring(cursor);
			const newContent = `${before}@${user.username} ${after}`;
			setContent(newContent);
			closeMention();

			// Restore focus and place cursor after inserted mention
			requestAnimationFrame(() => {
				textarea.focus();
				const newCursor = before.length + user.username.length + 2;
				textarea.setSelectionRange(newCursor, newCursor);
			});
		},
		[content, mention.triggerStart, closeMention],
	);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (!mention.open) return;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			setMention((m) => ({
				...m,
				activeIndex: Math.min(m.activeIndex + 1, m.users.length - 1),
			}));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setMention((m) => ({
				...m,
				activeIndex: Math.max(m.activeIndex - 1, 0),
			}));
		} else if (e.key === "Enter" || e.key === "Tab") {
			if (mention.users.length > 0) {
				e.preventDefault();
				selectUser(mention.users[mention.activeIndex]);
			}
		} else if (e.key === "Escape") {
			e.preventDefault();
			closeMention();
		}
	};

	useEffect(() => {
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (content.trim().length === 0) return;

		setLoading(true);
		setError("");

		try {
			await createPost({ data: { content } });
			setContent("");
			closeMention();
			onSuccess?.();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create post");
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} {...stylex.props(styles.form)}>
			{error && (
				<div {...stylex.props(styles.errorBox)}>
					<AlertCircle {...stylex.props(styles.errorIcon)} size={16} />
					{error}
				</div>
			)}

			<div {...stylex.props(styles.inputWrapper, isFocused && styles.inputWrapperFocused)}>
				<textarea
					ref={textareaRef}
					value={content}
					onChange={handleContentChange}
					onKeyDown={handleKeyDown}
					onFocus={() => setIsFocused(true)}
					onBlur={() => {
						setIsFocused(false);
						setTimeout(closeMention, 150);
					}}
					placeholder="What's happening?"
					{...stylex.props(styles.textarea)}
					rows={3}
					maxLength={280}
				/>
				{mention.open && (
					<MentionDropdown
						users={mention.users}
						activeIndex={mention.activeIndex}
						position={mention.position}
						onSelect={selectUser}
					/>
				)}
			</div>

			<div {...stylex.props(styles.footer)}>
				<CharacterCount count={content.length} max={280} />
				<button
					type="submit"
					disabled={loading || content.trim().length === 0 || content.length > 280}
					{...stylex.props(styles.submitButton)}
				>
					{loading ? (
						<>
							<div {...stylex.props(styles.spinner)} />
							Posting...
						</>
					) : (
						<>
							<Send size={20} />
							Post
						</>
					)}
				</button>
			</div>
		</form>
	);
}
