import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";
import { authedMutation, authedQuery } from "./lib/customFunctions";

const notificationValidator = v.object({
  _id: v.id("notifications"),
  videoId: v.id("videos"),
  message: v.string(),
  readAt: v.optional(v.number()),
  createdAt: v.number(),
  videoTitle: v.string(),
  actorUsername: v.string(),
});

async function enrichNotification(
  ctx: QueryCtx,
  notification: Doc<"notifications">,
) {
  const video = await ctx.db.get("videos", notification.videoId);
  const actor = await ctx.db.get("users", notification.actorId);

  return {
    _id: notification._id,
    videoId: notification.videoId,
    message: notification.message,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
    videoTitle: video?.title ?? "Unknown video",
    actorUsername: actor?.username ?? actor?.name ?? "Someone",
  };
}

export const assignedVideoCount = authedQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_assignedEditor", (q) =>
        q.eq("assignedEditorId", ctx.user._id),
      )
      .collect();

    return videos.filter((video) => video.status !== "completed").length;
  },
});

export const listNotifications = authedQuery({
  args: {},
  returns: v.array(notificationValidator),
  handler: async (ctx) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();

    const enriched = await Promise.all(
      notifications.map((notification) =>
        enrichNotification(ctx, notification),
      ),
    );

    return enriched.sort((a, b) => {
      const aUnread = a.readAt === undefined ? 0 : 1;
      const bUnread = b.readAt === undefined ? 0 : 1;
      if (aUnread !== bUnread) {
        return aUnread - bUnread;
      }
      return b.createdAt - a.createdAt;
    });
  },
});

export const markNotificationRead = authedMutation({
  args: {
    notificationId: v.id("notifications"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get("notifications", args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== ctx.user._id) {
      throw new Error("Unauthorized");
    }

    if (notification.readAt === undefined) {
      await ctx.db.patch("notifications", args.notificationId, {
        readAt: Date.now(),
      });
    }

    return null;
  },
});

export const markAllNotificationsRead = authedMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();

    const now = Date.now();
    for (const notification of notifications) {
      if (notification.readAt === undefined) {
        await ctx.db.patch("notifications", notification._id, { readAt: now });
      }
    }

    return null;
  },
});
