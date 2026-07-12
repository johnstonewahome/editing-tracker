import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";
import { authedMutation, authedQuery } from "./lib/customFunctions";

const MAX_TIMESTAMP_SECONDS = 86400;

const commentValidator = v.object({
  _id: v.id("comments"),
  videoId: v.id("videos"),
  userId: v.id("users"),
  body: v.string(),
  timestampSeconds: v.optional(v.number()),
  createdAt: v.number(),
  authorUsername: v.string(),
  authorAvatarUrl: v.union(v.string(), v.null()),
});

async function enrichComment(ctx: QueryCtx, comment: Doc<"comments">) {
  const author = await ctx.db.get("users", comment.userId);
  const authorAvatarUrl = author?.avatarStorageId
    ? await ctx.storage.getUrl(author.avatarStorageId)
    : null;

  return {
    _id: comment._id,
    videoId: comment.videoId,
    userId: comment.userId,
    body: comment.body,
    timestampSeconds: comment.timestampSeconds,
    createdAt: comment.createdAt,
    authorUsername: author?.username ?? author?.name ?? "Unknown",
    authorAvatarUrl,
  };
}

function sortComments(
  comments: Awaited<ReturnType<typeof enrichComment>>[],
) {
  const withTimestamp = comments
    .filter((comment) => comment.timestampSeconds !== undefined)
    .sort(
      (a, b) => (a.timestampSeconds ?? 0) - (b.timestampSeconds ?? 0),
    );

  const withoutTimestamp = comments
    .filter((comment) => comment.timestampSeconds === undefined)
    .sort((a, b) => a.createdAt - b.createdAt);

  return [...withTimestamp, ...withoutTimestamp];
}

export const listComments = authedQuery({
  args: {
    videoId: v.id("videos"),
  },
  returns: v.array(commentValidator),
  handler: async (ctx, args) => {
    const video = await ctx.db.get("videos", args.videoId);
    if (!video) {
      throw new Error("Video not found");
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();

    const enriched = await Promise.all(
      comments.map((comment) => enrichComment(ctx, comment)),
    );

    return sortComments(enriched);
  },
});

export const addComment = authedMutation({
  args: {
    videoId: v.id("videos"),
    body: v.string(),
    timestampSeconds: v.optional(v.number()),
  },
  returns: v.id("comments"),
  handler: async (ctx, args) => {
    const video = await ctx.db.get("videos", args.videoId);
    if (!video) {
      throw new Error("Video not found");
    }

    if (video.status !== "in_progress") {
      throw new Error("Comments are only allowed on videos being edited");
    }

    const body = args.body.trim();
    if (!body) {
      throw new Error("Comment cannot be empty");
    }

    if (args.timestampSeconds !== undefined) {
      if (
        !Number.isInteger(args.timestampSeconds) ||
        args.timestampSeconds < 0 ||
        args.timestampSeconds > MAX_TIMESTAMP_SECONDS
      ) {
        throw new Error("Timestamp must be between 0:00 and 24:00:00");
      }
    }

    return await ctx.db.insert("comments", {
      videoId: args.videoId,
      userId: ctx.user._id,
      body,
      timestampSeconds: args.timestampSeconds,
      createdAt: Date.now(),
    });
  },
});
