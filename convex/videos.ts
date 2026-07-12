import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";
import { authedMutation, authedQuery } from "./lib/customFunctions";
import {
  canDeleteVideo,
  canManageVideo,
  normalizeOptionalYoutubeUrl,
} from "./lib/auth";
import { createAssignmentNotification } from "./lib/notifications";
import { videoStatusValidator } from "./schema";

const videoSummaryValidator = v.object({
  _id: v.id("videos"),
  title: v.string(),
  storagePath: v.string(),
  youtubeUrl: v.optional(v.string()),
  status: videoStatusValidator,
  createdBy: v.id("users"),
  assignedEditorId: v.optional(v.id("users")),
  createdAt: v.number(),
  updatedAt: v.number(),
  uploaderUsername: v.string(),
  assignedEditorUsername: v.union(v.string(), v.null()),
  versionCount: v.number(),
});

async function enrichVideo(ctx: QueryCtx, video: Doc<"videos">) {
  const uploader = await ctx.db.get("users", video.createdBy);
  const editor = video.assignedEditorId
    ? await ctx.db.get("users", video.assignedEditorId)
    : null;
  const versions = await ctx.db
    .query("videoVersions")
    .withIndex("by_video", (q) => q.eq("videoId", video._id))
    .collect();

  return {
    _id: video._id,
    title: video.title,
    storagePath: video.storagePath,
    youtubeUrl: video.youtubeUrl,
    status: video.status,
    createdBy: video.createdBy,
    assignedEditorId: video.assignedEditorId,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
    uploaderUsername: uploader?.username ?? uploader?.name ?? "Unknown",
    assignedEditorUsername: editor
      ? (editor.username ?? editor.name ?? "Unknown")
      : null,
    versionCount: versions.length,
  };
}

export const listVideos = authedQuery({
  args: {
    status: videoStatusValidator,
  },
  returns: v.array(videoSummaryValidator),
  handler: async (ctx, args) => {
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();

    const enriched = await Promise.all(
      videos.map((video) => enrichVideo(ctx, video)),
    );

    return enriched.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const listActiveVideos = authedQuery({
  args: {},
  returns: v.array(videoSummaryValidator),
  handler: async (ctx) => {
    const [toEdit, inProgress] = await Promise.all([
      ctx.db
        .query("videos")
        .withIndex("by_status", (q) => q.eq("status", "to_edit"))
        .collect(),
      ctx.db
        .query("videos")
        .withIndex("by_status", (q) => q.eq("status", "in_progress"))
        .collect(),
    ]);

    const enriched = await Promise.all(
      [...toEdit, ...inProgress].map((video) => enrichVideo(ctx, video)),
    );

    return enriched.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getVideo = authedQuery({
  args: {
    videoId: v.id("videos"),
  },
  returns: v.union(
    v.object({
      _id: v.id("videos"),
      title: v.string(),
      storagePath: v.string(),
      youtubeUrl: v.optional(v.string()),
      status: videoStatusValidator,
      createdBy: v.id("users"),
      assignedEditorId: v.optional(v.id("users")),
      createdAt: v.number(),
      updatedAt: v.number(),
      uploaderUsername: v.string(),
      canManage: v.boolean(),
      canDelete: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const video = await ctx.db.get("videos", args.videoId);
    if (!video) {
      return null;
    }

    const uploader = await ctx.db.get("users", video.createdBy);

    return {
      _id: video._id,
      title: video.title,
      storagePath: video.storagePath,
      youtubeUrl: video.youtubeUrl,
      status: video.status,
      createdBy: video.createdBy,
      assignedEditorId: video.assignedEditorId,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
      uploaderUsername: uploader?.username ?? uploader?.name ?? "Unknown",
      canManage: canManageVideo(ctx.user, video),
      canDelete: canDeleteVideo(ctx.user, video),
    };
  },
});

export const createVideo = authedMutation({
  args: {
    title: v.string(),
    storagePath: v.string(),
    youtubeUrl: v.optional(v.string()),
  },
  returns: v.id("videos"),
  handler: async (ctx, args) => {
    const title = args.title.trim();
    const storagePath = args.storagePath.trim();

    if (!title) {
      throw new Error("Title is required");
    }

    if (!storagePath) {
      throw new Error("Storage path is required");
    }

    const youtubeUrl = normalizeOptionalYoutubeUrl(args.youtubeUrl);
    const now = Date.now();

    const videoId = await ctx.db.insert("videos", {
      title,
      storagePath,
      youtubeUrl,
      status: "to_edit",
      createdBy: ctx.user._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("videoVersions", {
      videoId,
      versionNumber: 1,
      storagePath,
      youtubeUrl,
      notes: "Initial version",
      createdBy: ctx.user._id,
      createdAt: now,
    });

    return videoId;
  },
});

export const updateVideoStatus = authedMutation({
  args: {
    videoId: v.id("videos"),
    status: videoStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const video = await ctx.db.get("videos", args.videoId);
    if (!video) {
      throw new Error("Video not found");
    }

    if (!canManageVideo(ctx.user, video)) {
      throw new Error("Unauthorized to update video status");
    }

    await ctx.db.patch("videos", args.videoId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const assignEditor = authedMutation({
  args: {
    videoId: v.id("videos"),
    editorId: v.optional(v.id("users")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const video = await ctx.db.get("videos", args.videoId);
    if (!video) {
      throw new Error("Video not found");
    }

    if (ctx.user.role !== "admin" && video.createdBy !== ctx.user._id) {
      throw new Error("Unauthorized to assign editor");
    }

    if (args.editorId) {
      const editor = await ctx.db.get("users", args.editorId);
      if (!editor) {
        throw new Error("Editor not found");
      }
    }

    const previousEditorId = video.assignedEditorId;

    await ctx.db.patch("videos", args.videoId, {
      assignedEditorId: args.editorId,
      updatedAt: Date.now(),
    });

    if (
      args.editorId &&
      args.editorId !== previousEditorId &&
      args.editorId !== ctx.user._id
    ) {
      await createAssignmentNotification(ctx, {
        userId: args.editorId,
        videoId: args.videoId,
        actorId: ctx.user._id,
        videoTitle: video.title,
      });
    }

    return null;
  },
});

export const deleteVideo = authedMutation({
  args: {
    videoId: v.id("videos"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const video = await ctx.db.get("videos", args.videoId);
    if (!video) {
      throw new Error("Video not found");
    }

    if (!canDeleteVideo(ctx.user, video)) {
      throw new Error("Unauthorized to delete video");
    }

    const versions = await ctx.db
      .query("videoVersions")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();

    for (const version of versions) {
      await ctx.db.delete("videoVersions", version._id);
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();

    for (const comment of comments) {
      await ctx.db.delete("comments", comment._id);
    }

    await ctx.db.delete("videos", args.videoId);
    return null;
  },
});
