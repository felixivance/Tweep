import * as stylex from "@stylexjs/stylex";
import { Repeat2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getRechirpStatus, toggleRechirp } from "../../server/functions/rechirps";
import { colors, radii, spacing } from "../../tokens.stylex";

const styles = stylex.create({
	button: {
		display: "flex",
		alignItems: "center",
		gap: spacing.sm,
		paddingLeft: spacing.sm,
		paddingRight: spacing.sm,
		paddingTop: spacing.sm,
		paddingBottom: spacing.sm,
		borderRadius: radii.full,
		transition: "all 0.2s",
		backgroundColor: "transparent",
		border: "none",
		cursor: "pointer",
		color: colors.gray400,
		":hover": {
			color: colors.emerald500,
			backgroundColor: "rgba(16, 185, 129, 0.1)",
		},
		":disabled": {
			opacity: 0.5,
			cursor: "not-allowed",
		},
	},
	buttonRechirped: {
		color: colors.emerald500,
		backgroundColor: "rgba(16, 185, 129, 0.1)",
	},
	count: {
		fontSize: "0.875rem",
		fontWeight: 500,
	},
});

interface RechirpButtonProps {
	postId: string;
	initialCount?: number;
	disabled?: boolean;
}

export function RechirpButton({ postId, initialCount = 0, disabled = false }: RechirpButtonProps) {
	const [rechirped, setRechirped] = useState(false);
	const [count, setCount] = useState(initialCount);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		loadStatus();
	}, [postId]);

	const loadStatus = async () => {
		try {
			const status = await getRechirpStatus({ data: postId });
			setRechirped(status.rechirped);
			setCount(status.count);
		} catch (error) {
			// User might not be logged in
			console.error("Failed to load rechirp status:", error);
		}
	};

	const handleToggle = async () => {
		if (loading || disabled) return;
		setLoading(true);

		try {
			const result = await toggleRechirp({ data: postId });
			setRechirped(result.rechirped);
			setCount(result.count);
		} catch (error) {
			console.error("Failed to toggle rechirp:", error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<button
			type="button"
			onClick={handleToggle}
			disabled={loading || disabled}
			title={disabled ? "Cannot rechirp your own post" : rechirped ? "Undo rechirp" : "Rechirp"}
			{...stylex.props(styles.button, rechirped && styles.buttonRechirped)}
		>
			<Repeat2 size={20} />
			<span {...stylex.props(styles.count)}>{count}</span>
		</button>
	);
}
