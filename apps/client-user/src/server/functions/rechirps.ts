import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createServerFn } from "@tanstack/react-start";
import {
	fromProtoTimestamp,
	getGrpcClient,
	getGrpcSessionToken,
	requireGrpcSessionToken,
} from "../../lib/grpc.server";
import { getSessionData } from "../../lib/session.server";

// ---------------------------------------------------------------------------
// Stub persistence — a JSON file in the project root acts as a lightweight DB.
// This gives cross-user visibility and survives server restarts, just like a
// real backend would, without touching apps/api/.
// ---------------------------------------------------------------------------

interface RechirpRecord {
	userId: string;
	username: string;
	postId: string;
	rechirpedAt: string;
	post: {
		id: string;
		content: string;
		createdAt: string;
		updatedAt: string;
		author: {
			id: string;
			username: string;
			displayName: string;
			avatarUrl?: string | null;
		} | null;
		likeCount: number;
		commentCount: number;
	};
}

const STUB_DB_PATH = join(process.cwd(), ".rechirps-stub.json");

function readDb(): RechirpRecord[] {
	try {
		if (!existsSync(STUB_DB_PATH)) return [];
		return JSON.parse(readFileSync(STUB_DB_PATH, "utf-8"));
	} catch {
		return [];
	}
}


function writeDb(records: RechirpRecord[]): void {
	writeFileSync(STUB_DB_PATH, JSON.stringify(records, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------

export const toggleRechirp = createServerFn({ method: "POST" })
	.inputValidator((d: string) => d)
	.handler(async ({ data: postId }) => {
		const sessionToken = await requireGrpcSessionToken();
		const session = await getSessionData();
		if (!session) throw new Error("Authentication required");

		const records = readDb();
		const existingIdx = records.findIndex(
			(r) => r.userId === session.userId && r.postId === postId,
		);

		let rechirped: boolean;

		if (existingIdx >= 0) {
			records.splice(existingIdx, 1);
			rechirped = false;
		} else {
			const client = getGrpcClient();
			const { response } = await client.posts.getPost({ postId, sessionToken });
			records.push({
				userId: session.userId,
				username: session.username,
				postId,
				rechirpedAt: new Date().toISOString(),
				post: {
					id: response.id,
					content: response.content,
					createdAt: fromProtoTimestamp(response.createdAt).toISOString(),
					updatedAt: fromProtoTimestamp(response.updatedAt).toISOString(),
					author: response.author
						? {
								id: response.author.id,
								username: response.author.username,
								displayName: response.author.displayName,
								avatarUrl: response.author.avatarUrl,
							}
						: null,
					likeCount: response.likeCount,
					commentCount: response.commentCount,
				},
			});
			rechirped = true;
		}

		writeDb(records);

		const count = records.filter((r) => r.postId === postId).length;
		return { success: true, rechirped, count };
	});

export const getRechirpStatus = createServerFn()
	.inputValidator((d: string) => d)
	.handler(async ({ data: postId }) => {
		await requireGrpcSessionToken();
		const session = await getSessionData();

		const records = readDb();
		const count = records.filter((r) => r.postId === postId).length;

		if (!session) return { rechirped: false, count };
		const rechirped = records.some((r) => r.userId === session.userId && r.postId === postId);
		return { rechirped, count };
	});

export const getUserRechirps = createServerFn()
	.inputValidator((d: string) => d)
	.handler(async ({ data: username }) => {
		await getGrpcSessionToken();

		const records = readDb();
		return records
			.filter((r) => r.username === username)
			.sort((a, b) => new Date(b.rechirpedAt).getTime() - new Date(a.rechirpedAt).getTime())
			.map((r) => ({
				...r.post,
				createdAt: new Date(r.post.createdAt),
				updatedAt: new Date(r.post.updatedAt),
				rechirpCount: records.filter((x) => x.postId === r.postId).length,
				isLiked: false,
			}));
	});
