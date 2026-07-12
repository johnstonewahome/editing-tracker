import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";
import { canManageVideo } from "./lib/auth";
import { authedMutation, authedQuery } from "./lib/customFunctions";

const MAX_TIMESTAMP_SECONDS = 86400;

const replyValidator = v.object({
  _id: v.id("comments"),
  videoId: v.id("videos"),
  userId: v.id("users"),
  body: v.string(),
  parentCommentId: v.id("comments"),
  createdAt: v.number(),
  authorUsername: v.string(),
  authorAvatarUrl: v.union(v.string(), v.null()),
});

const commentWithRepliesValidator = v.object({
  _id: v.id("comments"),
  videoId: v.id("videos"),
  userId: v.id("users"),
  body: v.string(),
  timestampSeconds: v.optional(v.number()),
  done: v.optional(v.boolean()),
  createdAt: v.number(),
  authorUsername: v.string(),
  authorAvatarUrl: v.union(v.string(), v.null()),
  replies: v.array(replyValidator),
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
    parentCommentId: comment.parentCommentId,
    timestampSeconds: comment.timestampSeconds,
    done: comment.done,
    createdAt: comment.createdAt,
    authorUsername: author?.username ?? author?.name ?? "Unknown",
    authorAvatarUrl,
  };
}

function enrichReply(
  comment: Awaited<ReturnType<typeof enrichComment>>,
) {
  if (!comment.parentCommentId) {
    throw new Error("Reply is missing parent comment");
  }

  return {
    _id: comment._id,
    videoId: comment.videoId,
    userId: comment.userId,
    body: comment.body,
    parentCommentId: comment.parentCommentId,
    createdAt: comment.createdAt,
    authorUsername: comment.authorUsername,
    authorAvatarUrl: comment.authorAvatarUrl,
  };
}

function sortByTimestampThenDate(
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

function sortTopLevelComments(
  comments: Awaited<ReturnType<typeof enrichComment>>[],
) {
  const pending = comments.filter((comment) => !comment.done);
  const done = comments.filter((comment) => comment.done);
  return [
    ...sortByTimestampThenDate(pending),
    ...sortByTimestampThenDate(done),
  ];
}

export const listComments = authedQuery({
  args: {
    videoId: v.id("videos"),
  },
  returns: v.array(commentWithRepliesValidator),
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

    const topLevel = enriched.filter((comment) => !comment.parentCommentId);
    const replies = enriched.filter((comment) => comment.parentCommentId);

    const repliesByParent = new Map<
      string,
      Awaited<ReturnType<typeof enrichReply>>[]
    >();

    for (const reply of replies) {
      const parentId = reply.parentCommentId!;
      const existing = repliesByParent.get(parentId) ?? [];
      existing.push(enrichReply(reply));
      repliesByParent.set(parentId, existing);
    }

    for (const [parentId, parentReplies] of repliesByParent) {
      parentReplies.sort((a, b) => a.createdAt - b.createdAt);
      repliesByParent.set(parentId, parentReplies);
    }

    return sortTopLevelComments(topLevel).map((comment) => ({
      _id: comment._id,
      videoId: comment.videoId,
      userId: comment.userId,
      body: comment.body,
      timestampSeconds: comment.timestampSeconds,
      done: comment.done,
      createdAt: comment.createdAt,
      authorUsername: comment.authorUsername,
      authorAvatarUrl: comment.authorAvatarUrl,
      replies: repliesByParent.get(comment._id) ?? [],
    }));
  },
});

export const addComment = authedMutation({
  args: {
    videoId: v.id("videos"),
    body: v.string(),
    timestampSeconds: v.optional(v.number()),
    parentCommentId: v.optional(v.id("comments")),
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

    if (args.parentCommentId) {
      const parent = await ctx.db.get("comments", args.parentCommentId);
      if (!parent || parent.videoId !== args.videoId) {
        throw new Error("Parent comment not found");
      }
      if (parent.parentCommentId) {
        throw new Error("Replies can only be added to top-level comments");
      }
      if (args.timestampSeconds !== undefined) {
        throw new Error("Replies cannot include timestamps");
      }
    } else if (args.timestampSeconds !== undefined) {
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
      parentCommentId: args.parentCommentId,
      timestampSeconds: args.parentCommentId ? undefined : args.timestampSeconds,
      done: args.parentCommentId ? undefined : false,
      createdAt: Date.now(),
    });
  },
});

export const toggleCommentDone = authedMutation({
  args: {
    commentId: v.id("comments"),
    done: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const comment = await ctx.db.get("comments", args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.parentCommentId) {
      throw new Error("Only top-level comments can be marked as done");
    }

    const video = await ctx.db.get("videos", comment.videoId);
    if (!video) {
      throw new Error("Video not found");
    }

    if (!canManageVideo(ctx.user, video)) {
      throw new Error("Only the assigned editor can update comment status");
    }

    await ctx.db.patch("comments", args.commentId, { done: args.done });
    return null;
  },
});
