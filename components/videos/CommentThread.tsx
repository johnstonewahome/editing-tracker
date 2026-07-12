"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CommentThread({
  videoId,
  status,
}: {
  videoId: Id<"videos">;
  status: "to_edit" | "in_progress" | "completed";
}) {
  const comments = useQuery(api.comments.listComments, { videoId });
  const addComment = useMutation(api.comments.addComment);
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await addComment({ videoId, body });
      setBody("");
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
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{comment.authorUsername}</span>
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
