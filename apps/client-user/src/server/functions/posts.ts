import type { PostResponse } from "@chirp/proto";
import { createServerFn } from "@tanstack/react-start";
import {
	fromProtoTimestamp,
	getGrpcClient,
	getGrpcSessionToken,
	requireGrpcSessionToken,
} from "../../lib/grpc.server";
import { getRechirpCountMap } from "../rechirps-stub.server";

function mapPostResponse(post: PostResponse, rechirpCounts: Map<string, number>) {
	return {
		id: post.id,
		content: post.content,
		createdAt: fromProtoTimestamp(post.createdAt),
		updatedAt: fromProtoTimestamp(post.updatedAt),
		author: post.author
			? {
					id: post.author.id,
					username: post.author.username,
					displayName: post.author.displayName,
					avatarUrl: post.author.avatarUrl,
				}
			: null,
		likeCount: post.likeCount,
		commentCount: post.commentCount,
		rechirpCount: rechirpCounts.get(post.id) ?? 0,
		isLiked: post.isLiked,
	};
}

export const createPost = createServerFn({ method: "POST" })
	.inputValidator((d: { content: string }) => d)
	.handler(async ({ data }) => {
		const sessionToken = await requireGrpcSessionToken();
		const client = getGrpcClient();

		const { response } = await client.posts.createPost({
			sessionToken,
			content: data.content,
		});

		if (!response.success) {
			throw new Error(response.error || "Failed to create post");
		}

		return { success: true, postId: response.postId };
	});

export const getPost = createServerFn()
	.inputValidator((d: string) => d)
	.handler(async ({ data: postId }) => {
		const sessionToken = await getGrpcSessionToken();
		const client = getGrpcClient();

		const { response } = await client.posts.getPost({
			sessionToken: sessionToken || "",
			postId,
		});

		return mapPostResponse(response, getRechirpCountMap());
	});

export const updatePost = createServerFn({ method: "POST" })
	.inputValidator((d: { postId: string; content: string }) => d)
	.handler(async ({ data }) => {
		const sessionToken = await requireGrpcSessionToken();
		const client = getGrpcClient();

		const { response } = await client.posts.updatePost({
			sessionToken,
			postId: data.postId,
			content: data.content,
		});

		if (!response.success) {
			throw new Error(response.error || "Failed to update post");
		}

		return { success: true };
	});

export const deletePost = createServerFn({ method: "POST" })
	.inputValidator((d: string) => d)
	.handler(async ({ data: postId }) => {
		const sessionToken = await requireGrpcSessionToken();
		const client = getGrpcClient();

		const { response } = await client.posts.deletePost({
			sessionToken,
			postId,
		});

		if (!response.success) {
			throw new Error(response.error || "Failed to delete post");
		}

		return { success: true };
	});

export const getPosts = createServerFn()
	.inputValidator((d?: { limit?: number; offset?: number }) => d)
	.handler(async ({ data: options }) => {
		const sessionToken = await getGrpcSessionToken();
		const client = getGrpcClient();

		const { response } = await client.posts.getPosts({
			sessionToken: sessionToken || "",
			pagination: {
				limit: options?.limit || 20,
				offset: options?.offset || 0,
			},
		});

		const rechirpCounts = getRechirpCountMap();
		return response.posts.map((p) => mapPostResponse(p, rechirpCounts));
	});

export const getUserPosts = createServerFn()
	.inputValidator((d: string) => d)
	.handler(async ({ data: username }) => {
		const sessionToken = await getGrpcSessionToken();
		const client = getGrpcClient();

		const { response } = await client.posts.getUserPosts({
			sessionToken: sessionToken || "",
			username,
		});

		const rechirpCounts = getRechirpCountMap();
		return response.posts.map((p) => mapPostResponse(p, rechirpCounts));
	});
