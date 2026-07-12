"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Clock, MessageSquare, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatTimestamp, parseTimestamp } from "@/lib/timestamp";
import type { YoutubePlayerHandle } from "@/components/videos/YoutubePlayer";

type CommentWithReplies = {
  _id: Id<"comments">;
  body: string;
  timestampSeconds?: number;
  done?: boolean;
  createdAt: number;
  authorUsername: string;
  authorAvatarUrl: string | null;
  replies: Array<{
    _id: Id<"comments">;
    body: string;
    createdAt: number;
    authorUsername: string;
    authorAvatarUrl: string | null;
  }>;
};

function ReplyForm({
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  onSubmit: (body: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [body, setBody] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim()) {
      return;
    }
    await onSubmit(body);
    setBody("");
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-2">
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Write a reply..."
        required
        rows={2}
        className="text-sm"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Posting..." : "Reply"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function CommentAvatar({
  username,
  avatarUrl,
  size = "md",
}: {
  username: string;
  avatarUrl: string | null;
  size?: "sm" | "md";
}) {
  return (
    <Avatar className={cn("shrink-0", size === "sm" ? "size-6" : "size-8")}>
      <AvatarImage src={avatarUrl ?? undefined} />
      <AvatarFallback className={size === "sm" ? "text-[10px]" : undefined}>
        {username.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function CommentCard({
  comment,
  canMarkDone,
  canReply,
  togglingId,
  replyingToId,
  isSubmittingReply,
  onTimestampClick,
  onToggleDone,
  onReply,
  onSubmitReply,
  onCancelReply,
}: {
  comment: CommentWithReplies;
  canMarkDone: boolean;
  canReply: boolean;
  togglingId: Id<"comments"> | null;
  replyingToId: Id<"comments"> | null;
  isSubmittingReply: boolean;
  onTimestampClick: (seconds: number) => void;
  onToggleDone: (commentId: Id<"comments">, done: boolean) => void;
  onReply: (commentId: Id<"comments">) => void;
  onSubmitReply: (commentId: Id<"comments">, body: string) => Promise<void>;
  onCancelReply: () => void;
}) {
  return (
    <Card className={cn(comment.done && "opacity-70")}>
      <CardContent className="flex gap-3 pt-4">
        <CommentAvatar
          username={comment.authorUsername}
          avatarUrl={comment.authorAvatarUrl}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{comment.authorUsername}</span>
            {comment.done && (
              <Badge variant="outline" className="gap-1 text-emerald-600">
                <Check className="size-3" />
                Done
              </Badge>
            )}
            {comment.timestampSeconds !== undefined && (
              <button
                type="button"
                onClick={() => onTimestampClick(comment.timestampSeconds!)}
                className="inline-flex"
              >
                <Badge
                  variant="secondary"
                  className="cursor-pointer gap-1 hover:bg-secondary/80"
                >
                  <Clock className="size-3" />
                  {formatTimestamp(comment.timestampSeconds)}
                </Badge>
              </button>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(comment.createdAt).toLocaleString()}
            </span>
          </div>
          <p
            className={cn(
              "text-sm whitespace-pre-wrap",
              comment.done && "text-muted-foreground line-through",
            )}
          >
            {comment.body}
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            {canReply && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onReply(comment._id)}
              >
                <MessageSquare className="size-3" />
                Reply
              </Button>
            )}
            {canMarkDone &&
              (comment.done ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={togglingId === comment._id}
                  onClick={() => onToggleDone(comment._id, false)}
                >
                  <RotateCcw className="size-3" />
                  Reopen
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={togglingId === comment._id}
                  onClick={() => onToggleDone(comment._id, true)}
                >
                  <Check className="size-3" />
                  Mark done
                </Button>
              ))}
          </div>

          {replyingToId === comment._id && (
            <div className="pt-2">
              <ReplyForm
                onSubmit={(body) => onSubmitReply(comment._id, body)}
                onCancel={onCancelReply}
                isSubmitting={isSubmittingReply}
              />
            </div>
          )}

          {comment.replies.length > 0 && (
            <div className="mt-3 space-y-3 border-l-2 border-muted pl-3">
              {comment.replies.map((reply) => (
                <div key={reply._id} className="flex gap-2">
                  <CommentAvatar
                    username={reply.authorUsername}
                    avatarUrl={reply.authorAvatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium">
                        {reply.authorUsername}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(reply.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CommentThread({
  videoId,
  status,
  hasYoutube,
  canMarkDone,
  playerRef,
  playerReady,
}: {
  videoId: Id<"videos">;
  status: "to_edit" | "in_progress" | "completed";
  hasYoutube: boolean;
  canMarkDone: boolean;
  playerRef: React.RefObject<YoutubePlayerHandle | null>;
  playerReady: boolean;
}) {
  const comments = useQuery(api.comments.listComments, { videoId });
  const addComment = useMutation(api.comments.addComment);
  const toggleCommentDone = useMutation(api.comments.toggleCommentDone);
  const [body, setBody] = useState("");
  const [timestampInput, setTimestampInput] = useState("");
  const [timestampError, setTimestampError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [togglingId, setTogglingId] = useState<Id<"comments"> | null>(null);
  const [replyingToId, setReplyingToId] = useState<Id<"comments"> | null>(null);

  const canReply = status === "in_progress";

  const handleUseCurrentTime = () => {
    const currentTime = playerRef.current?.getCurrentTime();
    if (currentTime === null || currentTime === undefined) {
      toast.error("Player is not ready yet");
      return;
    }
    setTimestampInput(formatTimestamp(currentTime));
    setTimestampError(null);
  };

  const handleTimestampClick = (seconds: number) => {
    if (!hasYoutube) {
      toast.message("Add a YouTube link to jump to timestamps");
      return;
    }
    if (!playerRef.current || !playerReady) {
      toast.error("Player is not ready yet");
      return;
    }
    playerRef.current.seekTo(seconds);
  };

  const handleToggleDone = async (commentId: Id<"comments">, done: boolean) => {
    setTogglingId(commentId);
    try {
      await toggleCommentDone({ commentId, done });
      toast.success(done ? "Comment marked as done" : "Comment reopened");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update comment",
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleSubmitReply = async (parentCommentId: Id<"comments">, replyBody: string) => {
    setIsSubmittingReply(true);
    try {
      await addComment({
        videoId,
        body: replyBody,
        parentCommentId,
      });
      setReplyingToId(null);
      toast.success("Reply added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add reply");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTimestampError(null);

    let timestampSeconds: number | undefined;
    if (timestampInput.trim()) {
      const parsed = parseTimestamp(timestampInput);
      if (parsed === null) {
        setTimestampError("Use format mm:ss or h:mm:ss");
        return;
      }
      timestampSeconds = parsed;
    }

    setIsSubmitting(true);
    try {
      await addComment({
        videoId,
        body,
        timestampSeconds,
      });
      setBody("");
      setTimestampInput("");
      toast.success("Comment added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (comments === undefined) {
    return <p className="text-sm text-muted-foreground">Loading comments...</p>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {status === "in_progress" ? (
        <Card className="shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add change request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="comment-timestamp">Timestamp (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="comment-timestamp"
                    value={timestampInput}
                    onChange={(event) => {
                      setTimestampInput(event.target.value);
                      setTimestampError(null);
                    }}
                    placeholder="mm:ss or h:mm:ss"
                    className="max-w-[160px]"
                  />
                  {hasYoutube && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUseCurrentTime}
                      disabled={!playerReady}
                    >
                      Use current time
                    </Button>
                  )}
                </div>
                {timestampError && (
                  <p className="text-sm text-destructive">{timestampError}</p>
                )}
              </div>
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Describe the changes needed..."
                required
                rows={3}
              />
              <Button type="submit" disabled={isSubmitting} size="sm">
                {isSubmitting ? "Posting..." : "Post comment"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="shrink-0 text-sm text-muted-foreground">
          Comments can only be added while the video is in progress.
        </p>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <CommentCard
              key={comment._id}
              comment={comment}
              canMarkDone={canMarkDone}
              canReply={canReply}
              togglingId={togglingId}
              replyingToId={replyingToId}
              isSubmittingReply={isSubmittingReply}
              onTimestampClick={handleTimestampClick}
              onToggleDone={(commentId, done) =>
                void handleToggleDone(commentId, done)
              }
              onReply={setReplyingToId}
              onSubmitReply={handleSubmitReply}
              onCancelReply={() => setReplyingToId(null)}
            />
          ))
        )}
      </div>
    </div>
  );
}
