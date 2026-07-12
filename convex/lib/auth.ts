import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db.get("users", userId);
  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function getCurrentUserOrNull(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }

  return await ctx.db.get("users", userId);
}

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return user;
}

export function canManageVideo(
  user: Doc<"users">,
  video: Doc<"videos">,
): boolean {
  return (
    user.role === "admin" ||
    video.createdBy === user._id ||
    video.assignedEditorId === user._id
  );
}

export function canDeleteVideo(
  user: Doc<"users">,
  video: Doc<"videos">,
): boolean {
  return user.role === "admin" || video.createdBy === user._id;
}

export function isValidYoutubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+/.test(
    url.trim(),
  );
}

export function normalizeOptionalYoutubeUrl(
  youtubeUrl: string | undefined,
): string | undefined {
  if (!youtubeUrl?.trim()) {
    return undefined;
  }

  const trimmed = youtubeUrl.trim();
  if (!isValidYoutubeUrl(trimmed)) {
    throw new Error("Invalid YouTube URL");
  }

  return trimmed;
}
