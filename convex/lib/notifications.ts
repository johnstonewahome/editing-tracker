import { Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

export async function createAssignmentNotification(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    videoId: Id<"videos">;
    actorId: Id<"users">;
    videoTitle: string;
  },
) {
  await ctx.db.insert("notifications", {
    userId: args.userId,
    type: "assignment",
    videoId: args.videoId,
    actorId: args.actorId,
    message: `You were assigned to edit "${args.videoTitle}"`,
    createdAt: Date.now(),
  });
}
