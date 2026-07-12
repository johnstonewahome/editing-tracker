import { Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

type NotificationType =
  | "assignment"
  | "comment"
  | "comment_reply"
  | "comment_done";

async function getActorName(ctx: MutationCtx, actorId: Id<"users">) {
  const actor = await ctx.db.get("users", actorId);
  return actor?.username ?? actor?.name ?? "Someone";
}

async function createNotification(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    type: NotificationType;
    videoId: Id<"videos">;
    actorId: Id<"users">;
    message: string;
    commentId?: Id<"comments">;
  },
) {
  if (args.userId === args.actorId) {
    return;
  }

  await ctx.db.insert("notifications", {
    userId: args.userId,
    type: args.type,
    videoId: args.videoId,
    commentId: args.commentId,
    actorId: args.actorId,
    message: args.message,
    createdAt: Date.now(),
  });
}

export async function createAssignmentNotification(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    videoId: Id<"videos">;
    actorId: Id<"users">;
    videoTitle: string;
  },
) {
  const actorName = await getActorName(ctx, args.actorId);
  await createNotification(ctx, {
    userId: args.userId,
    type: "assignment",
    videoId: args.videoId,
    actorId: args.actorId,
    message: `${actorName} assigned you to edit "${args.videoTitle}"`,
  });
}

export async function createCommentNotification(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    videoId: Id<"videos">;
    commentId: Id<"comments">;
    actorId: Id<"users">;
    videoTitle: string;
  },
) {
  const actorName = await getActorName(ctx, args.actorId);
  await createNotification(ctx, {
    userId: args.userId,
    type: "comment",
    videoId: args.videoId,
    commentId: args.commentId,
    actorId: args.actorId,
    message: `${actorName} commented on "${args.videoTitle}"`,
  });
}

export async function createCommentReplyNotification(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    videoId: Id<"videos">;
    commentId: Id<"comments">;
    actorId: Id<"users">;
    videoTitle: string;
  },
) {
  const actorName = await getActorName(ctx, args.actorId);
  await createNotification(ctx, {
    userId: args.userId,
    type: "comment_reply",
    videoId: args.videoId,
    commentId: args.commentId,
    actorId: args.actorId,
    message: `${actorName} replied to your comment on "${args.videoTitle}"`,
  });
}

export async function createCommentDoneNotification(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    videoId: Id<"videos">;
    commentId: Id<"comments">;
    actorId: Id<"users">;
    videoTitle: string;
  },
) {
  const actorName = await getActorName(ctx, args.actorId);
  await createNotification(ctx, {
    userId: args.userId,
    type: "comment_done",
    videoId: args.videoId,
    commentId: args.commentId,
    actorId: args.actorId,
    message: `${actorName} marked your comment as done on "${args.videoTitle}"`,
  });
}
