import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface RechirpRecord {
	postId: string;
	[key: string]: unknown;
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

/**
 * Returns a map of postId → rechirp count, built from the stub DB.
 * Used by feed/posts/bookmarks server functions to populate rechirpCount
 * without touching apps/api/.
 */
export function getRechirpCountMap(): Map<string, number> {
	const records = readDb();
	const map = new Map<string, number>();
	for (const r of records) {
		map.set(r.postId, (map.get(r.postId) ?? 0) + 1);
	}
	return map;
}
