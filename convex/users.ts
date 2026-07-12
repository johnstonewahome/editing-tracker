import { getAuthUserId, modifyAccountCredentials, retrieveAccount } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalQuery } from "./_generated/server";
import { authedMutation, authedQuery } from "./lib/customFunctions";
import { requireAdmin } from "./lib/auth";

const userSummaryValidator = v.object({
  _id: v.id("users"),
  username: v.string(),
  email: v.string(),
  role: v.union(v.literal("user"), v.literal("admin")),
  avatarUrl: v.union(v.string(), v.null()),
});

export const current = authedQuery({
  args: {},
  returns: v.object({
    _id: v.id("users"),
    username: v.string(),
    email: v.string(),
    role: v.union(v.literal("user"), v.literal("admin")),
    avatarUrl: v.union(v.string(), v.null()),
  }),
  handler: async (ctx) => {
    const avatarUrl = ctx.user.avatarStorageId
      ? await ctx.storage.getUrl(ctx.user.avatarStorageId)
      : null;

    return {
      _id: ctx.user._id,
      username: ctx.user.username ?? ctx.user.name ?? "User",
      email: ctx.user.email ?? "",
      role: ctx.user.role ?? "user",
      avatarUrl,
    };
  },
});

export const listUserOptions = authedQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      username: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users
      .map((user) => ({
        _id: user._id,
        username: user.username ?? user.name ?? "User",
      }))
      .sort((a, b) => a.username.localeCompare(b.username));
  },
});

export const listUsers = authedQuery({
  args: {},
  returns: v.array(userSummaryValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();
    const summaries = await Promise.all(
      users.map(async (user) => {
        const avatarUrl = user.avatarStorageId
          ? await ctx.storage.getUrl(user.avatarStorageId)
          : null;

        return {
          _id: user._id,
          username: user.username ?? user.name ?? "User",
          email: user.email ?? "",
          role: user.role ?? "user",
          avatarUrl,
        };
      }),
    );

    return summaries.sort((a, b) => a.username.localeCompare(b.username));
  },
});

export const updateUsername = authedMutation({
  args: {
    username: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const username = args.username.trim();
    if (username.length < 3) {
      throw new Error("Username must be at least 3 characters");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();

    if (existing && existing._id !== ctx.user._id) {
      throw new Error("Username is already taken");
    }

    await ctx.db.patch("users", ctx.user._id, {
      username,
      name: username,
    });

    return null;
  },
});

export const generateAvatarUploadUrl = authedMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveAvatar = authedMutation({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("users", ctx.user._id, {
      avatarStorageId: args.storageId,
    });
    return null;
  },
});

export const promoteToAdmin = authedMutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const target = await ctx.db.get("users", args.userId);
    if (!target) {
      throw new Error("User not found");
    }

    await ctx.db.patch("users", args.userId, {
      role: "admin",
    });

    return null;
  },
});

export const getUserEmail = internalQuery({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    return user?.email ?? null;
  },
});

export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    if (args.newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters");
    }

    const email = await ctx.runQuery(internal.users.getUserEmail, { userId });
    if (!email) {
      throw new Error("User email not found");
    }

    const account = await retrieveAccount(ctx, {
      provider: "password",
      account: {
        id: email,
        secret: args.currentPassword,
      },
    });

    if (account === null) {
      throw new Error("Current password is incorrect");
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: {
        id: email,
        secret: args.newPassword,
      },
    });

    return null;
  },
});
