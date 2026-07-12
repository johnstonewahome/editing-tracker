"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Clock } from "lucide-react";
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
import { formatTimestamp, parseTimestamp } from "@/lib/timestamp";
import type { YoutubePlayerHandle } from "@/components/videos/YoutubePlayer";

export function CommentThread({
  videoId,
  status,
  hasYoutube,
  playerRef,
  playerReady,
}: {
  videoId: Id<"videos">;
  status: "to_edit" | "in_progress" | "completed";
  hasYoutube: boolean;
  playerRef: React.RefObject<YoutubePlayerHandle | null>;
  playerReady: boolean;
}) {
  const comments = useQuery(api.comments.listComments, { videoId });
  const addComment = useMutation(api.comments.addComment);
  const [body, setBody] = useState("");
  const [timestampInput, setTimestampInput] = useState("");
  const [timestampError, setTimestampError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <div className="space-y-4">
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <Card key={comment._id}>
              <CardContent className="flex gap-3 pt-6">
                <Avatar className="size-9">
                  <AvatarImage src={comment.authorAvatarUrl ?? undefined} />
                  <AvatarFallback>
                    {comment.authorUsername.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{comment.authorUsername}</span>
                    {comment.timestampSeconds !== undefined && (
                      <button
                        type="button"
                        onClick={() => handleTimestampClick(comment.timestampSeconds!)}
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
                  <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {status === "in_progress" ? (
        <Card>
          <CardHeader>
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
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Posting..." : "Post comment"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          Comments can only be added while the video is in progress.
        </p>
      )}
    </div>
  );
}
