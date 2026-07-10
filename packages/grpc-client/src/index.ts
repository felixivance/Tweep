// Re-export proto types for convenience
export * from "@tweep/proto";
export type { TweepClient, TweepClientConfig } from "./client";
export { createTweepClient, DEFAULT_GRPC_HOST } from "./client";
