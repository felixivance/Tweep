import * as stylex from "@stylexjs/stylex";
import { radii, semanticColors, shadows, spacing } from "../../tokens.stylex";
import { UserAvatar } from "../users/UserAvatar";

const styles = stylex.create({
	dropdown: {
		position: "absolute",
		zIndex: 50,
		minWidth: "14rem",
		backgroundColor: semanticColors.surfaceCard,
		borderRadius: radii.lg,
		boxShadow: shadows.lg,
		border: `1px solid ${semanticColors.borderSubtle}`,
		overflow: "hidden",
		paddingTop: spacing.xs,
		paddingBottom: spacing.xs,
	},
	option: {
		display: "flex",
		alignItems: "center",
		gap: spacing.sm,
		paddingLeft: spacing.md,
		paddingRight: spacing.md,
		paddingTop: spacing.sm,
		paddingBottom: spacing.sm,
		cursor: "pointer",
		backgroundColor: "transparent",
		border: "none",
		width: "100%",
		textAlign: "left",
		transition: "background-color 0.15s",
	},
	optionActive: {
		backgroundColor: semanticColors.bgSecondary,
	},
	optionText: {
		display: "flex",
		flexDirection: "column",
		minWidth: 0,
	},
	displayName: {
		fontWeight: 600,
		fontSize: "0.875rem",
		color: semanticColors.textPrimary,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	username: {
		fontSize: "0.8125rem",
		color: semanticColors.textSecondary,
	},
	noResults: {
		paddingLeft: spacing.md,
		paddingRight: spacing.md,
		paddingTop: spacing.sm,
		paddingBottom: spacing.sm,
		fontSize: "0.875rem",
		color: semanticColors.textTertiary,
	},
});

interface MentionUser {
	id: string;
	username: string;
	displayName: string;
	avatarUrl?: string | null;
}

interface MentionDropdownProps {
	users: MentionUser[];
	activeIndex: number;
	position: { top: number; left: number };
	onSelect: (user: MentionUser) => void;
}

export function MentionDropdown({ users, activeIndex, position, onSelect }: MentionDropdownProps) {
	return (
		<div
			role="listbox"
			aria-label="Mention suggestions"
			{...stylex.props(styles.dropdown)}
			style={{ top: position.top, left: position.left }}
		>
			{users.length === 0 ? (
				<div {...stylex.props(styles.noResults)}>No users found</div>
			) : (
				users.map((user, index) => (
					<button
						key={user.id}
						type="button"
						role="option"
						aria-selected={index === activeIndex}
						data-mention-option
						onMouseDown={(e) => {
							e.preventDefault();
							onSelect(user);
						}}
						{...stylex.props(styles.option, index === activeIndex && styles.optionActive)}
					>
						<UserAvatar avatarUrl={user.avatarUrl} username={user.username} size="sm" />
						<div {...stylex.props(styles.optionText)}>
							<span {...stylex.props(styles.displayName)}>{user.displayName}</span>
							<span {...stylex.props(styles.username)}>@{user.username}</span>
						</div>
					</button>
				))
			)}
		</div>
	);
}
