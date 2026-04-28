import * as stylex from "@stylexjs/stylex";
import { X } from "lucide-react";
import { colors, fontSize, fontWeight, radii, semanticColors, shadows, spacing } from "../../tokens.stylex";

const styles = stylex.create({
	backdrop: {
		position: "fixed",
		inset: 0,
		backgroundColor: "rgba(0,0,0,0.45)",
		zIndex: 100,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	panel: {
		backgroundColor: semanticColors.surfaceCard,
		borderRadius: radii.xl,
		boxShadow: shadows["2xl"],
		padding: spacing["2xl"],
		width: "min(36rem, 90vw)",
		maxHeight: "80vh",
		overflowY: "auto",
	},
	header: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: spacing.xl,
	},
	title: {
		fontSize: fontSize.lg,
		fontWeight: fontWeight.bold,
		color: semanticColors.textPrimary,
	},
	closeBtn: {
		padding: spacing.xs,
		backgroundColor: "transparent",
		border: "none",
		cursor: "pointer",
		color: semanticColors.textTertiary,
		borderRadius: radii.md,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		transition: "color 0.15s, background-color 0.15s",
		":hover": {
			color: semanticColors.textPrimary,
			backgroundColor: semanticColors.bgSecondary,
		},
	},
	section: {
		marginBottom: spacing.lg,
	},
	sectionTitle: {
		fontSize: fontSize.xs,
		fontWeight: fontWeight.semibold,
		color: semanticColors.textTertiary,
		textTransform: "uppercase",
		letterSpacing: "0.08em",
		marginBottom: spacing.sm,
	},
	row: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		paddingTop: spacing.xs,
		paddingBottom: spacing.xs,
	},
	description: {
		fontSize: fontSize.sm,
		color: semanticColors.textSecondary,
	},
	keys: {
		display: "flex",
		gap: spacing.xs,
		alignItems: "center",
	},
	kbd: {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		minWidth: "1.75rem",
		height: "1.75rem",
		paddingLeft: spacing.sm,
		paddingRight: spacing.sm,
		backgroundColor: semanticColors.bgSecondary,
		border: `1px solid ${semanticColors.borderSubtle}`,
		borderRadius: radii.md,
		fontSize: fontSize.xs,
		fontWeight: fontWeight.semibold,
		color: semanticColors.textPrimary,
		fontFamily: "monospace",
	},
	or: {
		fontSize: fontSize.xs,
		color: semanticColors.textTertiary,
	},
	footer: {
		marginTop: spacing.xl,
		paddingTop: spacing.md,
		borderTop: `1px solid ${semanticColors.borderSubtle}`,
		fontSize: fontSize.xs,
		color: semanticColors.textTertiary,
		textAlign: "center",
	},
});

interface ShortcutRowProps {
	description: string;
	keys: string[][];
}

function ShortcutRow({ description, keys }: ShortcutRowProps) {
	return (
		<div {...stylex.props(styles.row)}>
			<span {...stylex.props(styles.description)}>{description}</span>
			<div {...stylex.props(styles.keys)}>
				{keys.map((group, i) => (
					<span key={group.join("")} {...stylex.props(styles.keys)}>
						{i > 0 && <span {...stylex.props(styles.or)}>or</span>}
						{group.map((k) => (
							<kbd key={k} {...stylex.props(styles.kbd)}>{k}</kbd>
						))}
					</span>
				))}
			</div>
		</div>
	);
}

interface KeyboardHelpOverlayProps {
	onClose: () => void;
}

export function KeyboardHelpOverlay({ onClose }: KeyboardHelpOverlayProps) {
	return (
		<div
			{...stylex.props(styles.backdrop)}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			aria-modal="true"
			role="dialog"
			aria-label="Keyboard shortcuts"
		>
			<div {...stylex.props(styles.panel)}>
				<div {...stylex.props(styles.header)}>
					<h2 {...stylex.props(styles.title)}>Keyboard Shortcuts</h2>
					<button
						type="button"
						onClick={onClose}
						{...stylex.props(styles.closeBtn)}
						aria-label="Close"
					>
						<X size={18} />
					</button>
				</div>

				<div {...stylex.props(styles.section)}>
					<p {...stylex.props(styles.sectionTitle)}>Navigation</p>
					<ShortcutRow description="Focus next post" keys={[["j"], ["↓"]]} />
					<ShortcutRow description="Focus previous post" keys={[["k"], ["↑"]]} />
					<ShortcutRow description="Clear focus" keys={[["Esc"]]} />
				</div>

				<div {...stylex.props(styles.section)}>
					<p {...stylex.props(styles.sectionTitle)}>Actions on focused post</p>
					<ShortcutRow description="Like / unlike" keys={[["l"]]} />
					<ShortcutRow description="Bookmark / unbookmark" keys={[["b"]]} />
					<ShortcutRow description="Open post" keys={[["o"], ["Enter"]]} />
					<ShortcutRow description="Reply to post" keys={[["r"]]} />
				</div>

				<div {...stylex.props(styles.section)}>
					<p {...stylex.props(styles.sectionTitle)}>General</p>
					<ShortcutRow description="Show / hide this help" keys={[["?"]]} />
				</div>

				<p {...stylex.props(styles.footer)}>
					Shortcuts are disabled while typing in text fields
				</p>
			</div>
		</div>
	);
}
