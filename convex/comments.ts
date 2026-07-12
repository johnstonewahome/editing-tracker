import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";
import { authedMutation, authedQuery } from "./lib/customFunctions";

const commentValidator = v.object({
  _id: v.id("comments"),
  videoId: v.id("videos"),
  userId: v.id("users"),
  body: v.string(),
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
    createdAt: comment.createdAt,
    authorUsername: author?.username ?? author?.name ?? "Unknown",
    authorAvatarUrl,
  };
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

    return enriched.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const addComment = authedMutation({
  args: {
    videoId: v.id("videos"),
    body: v.string(),
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

    return await ctx.db.insert("comments", {
      videoId: args.videoId,
      userId: ctx.user._id,
      body,
      createdAt: Date.now(),
    });
  },
});
