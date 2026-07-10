import { useSession } from "@tanstack/react-start/server";

export interface SessionData {
	userId: string;
	username: string;
}

const _SESSION_SECRET_ENV = process.env.SESSION_SECRET;
if (!_SESSION_SECRET_ENV) {
	if (process.env.NODE_ENV === "production") {
		throw new Error(
			"SESSION_SECRET environment variable is required in production. " +
				"Set it to a cryptographically random string of at least 32 characters.",
		);
	}
	console.warn(
		"[tweep] WARNING: SESSION_SECRET is not set. " +
			"Using an insecure fallback — set SESSION_SECRET before deploying to production.",
	);
}
const SESSION_SECRET = _SESSION_SECRET_ENV ?? "tweep-session-secret-key-at-least-32-chars";

export function useAppSession() {
	return useSession<SessionData>({
		password: SESSION_SECRET,
		name: "tweep-session",
		cookie: {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 60 * 60 * 24 * 7, // 7 days
		},
	});
}

export async function getSessionData(): Promise<SessionData | null> {
	const session = await useAppSession();
	if (!session.data.userId) {
		return null;
	}
	return session.data as SessionData;
}

export async function setSessionData(data: SessionData): Promise<void> {
	const session = await useAppSession();
	await session.update(data);
}

export async function clearSessionData(): Promise<void> {
	const session = await useAppSession();
	await session.clear();
}

export async function requireAuth(): Promise<SessionData> {
	const session = await getSessionData();
	if (!session) {
		throw new Error("Unauthorized");
	}
	return session;
}
