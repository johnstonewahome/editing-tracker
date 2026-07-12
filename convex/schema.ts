import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export const videoStatusValidator = v.union(
  v.literal("to_edit"),
  v.literal("in_progress"),
  v.literal("completed"),
);

export const userRoleValidator = v.union(
  v.literal("user"),
  v.literal("admin"),
);

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    username: v.optional(v.string()),
    role: v.optional(userRoleValidator),
    avatarStorageId: v.optional(v.id("_storage")),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_username", ["username"]),
  videos: defineTable({
    title: v.string(),
    storagePath: v.string(),
    youtubeUrl: v.optional(v.string()),
    status: videoStatusValidator,
    createdBy: v.id("users"),
    assignedEditorId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_createdBy", ["createdBy"])
    .index("by_assignedEditor", ["assignedEditorId"]),
  videoVersions: defineTable({
    videoId: v.id("videos"),
    versionNumber: v.number(),
    storagePath: v.string(),
    youtubeUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_video", ["videoId"])
    .index("by_video_and_version", ["videoId", "versionNumber"]),
  comments: defineTable({
    videoId: v.id("videos"),
    userId: v.id("users"),
    body: v.string(),
    parentCommentId: v.optional(v.id("comments")),
    timestampSeconds: v.optional(v.number()),
    done: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_video", ["videoId"])
    .index("by_parent", ["parentCommentId"]),
  notifications: defineTable({
    userId: v.id("users"),
    type: v.literal("assignment"),
    videoId: v.id("videos"),
    actorId: v.id("users"),
    message: v.string(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
