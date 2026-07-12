"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewVideoPage() {
  const router = useRouter();
  const createVideo = useMutation(api.videos.createVideo);
  const [title, setTitle] = useState("");
  const [storagePath, setStoragePath] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const videoId = await createVideo({
        title,
        storagePath,
        youtubeUrl: youtubeUrl || undefined,
      });
      toast.success("Video registered");
      router.push(`/videos/${videoId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to register video");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Register video</h1>
        <p className="text-muted-foreground">
          Add a video project with its storage path and optional YouTube preview link.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Video details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Client promo cut"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storagePath">Storage path</Label>
              <Input
                id="storagePath"
                value={storagePath}
                onChange={(event) => setStoragePath(event.target.value)}
                placeholder="/Volumes/Projects/client/video_v1.mov"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtubeUrl">YouTube URL (optional)</Label>
              <Input
                id="youtubeUrl"
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Register video"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
