import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";
import { authedMutation, authedQuery } from "./lib/customFunctions";
import { canManageVideo, normalizeOptionalYoutubeUrl } from "./lib/auth";

const versionValidator = v.object({
  _id: v.id("videoVersions"),
  videoId: v.id("videos"),
  versionNumber: v.number(),
  storagePath: v.string(),
  youtubeUrl: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdBy: v.id("users"),
  createdAt: v.number(),
  authorUsername: v.string(),
});

async function enrichVersion(ctx: QueryCtx, version: Doc<"videoVersions">) {
  const author = await ctx.db.get("users", version.createdBy);
  return {
    _id: version._id,
    videoId: version.videoId,
    versionNumber: version.versionNumber,
    storagePath: version.storagePath,
    youtubeUrl: version.youtubeUrl,
    notes: version.notes,
    createdBy: version.createdBy,
    createdAt: version.createdAt,
    authorUsername: author?.username ?? author?.name ?? "Unknown",
  };
}

export const listVersions = authedQuery({
  args: {
    videoId: v.id("videos"),
  },
  returns: v.array(versionValidator),
  handler: async (ctx, args) => {
    const video = await ctx.db.get("videos", args.videoId);
    if (!video) {
      throw new Error("Video not found");
    }

    const versions = await ctx.db
      .query("videoVersions")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();

    const enriched = await Promise.all(
      versions.map((version) => enrichVersion(ctx, version)),
    );

    return enriched.sort((a, b) => b.versionNumber - a.versionNumber);
  },
});

export const addVersion = authedMutation({
  args: {
    videoId: v.id("videos"),
    storagePath: v.string(),
    youtubeUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("videoVersions"),
  handler: async (ctx, args) => {
    const video = await ctx.db.get("videos", args.videoId);
    if (!video) {
      throw new Error("Video not found");
    }

    if (!canManageVideo(ctx.user, video)) {
      throw new Error("Unauthorized to add version");
    }

    const storagePath = args.storagePath.trim();
    if (!storagePath) {
      throw new Error("Storage path is required");
    }

    const youtubeUrl = normalizeOptionalYoutubeUrl(args.youtubeUrl);
    const existingVersions = await ctx.db
      .query("videoVersions")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();

    const versionNumber =
      existingVersions.reduce(
        (max, version) => Math.max(max, version.versionNumber),
        0,
      ) + 1;

    const now = Date.now();
    const versionId = await ctx.db.insert("videoVersions", {
      videoId: args.videoId,
      versionNumber,
      storagePath,
      youtubeUrl,
      notes: args.notes?.trim() || undefined,
      createdBy: ctx.user._id,
      createdAt: now,
    });

    await ctx.db.patch("videos", args.videoId, {
      storagePath,
      youtubeUrl,
      updatedAt: now,
    });

    return versionId;
  },
});
