"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CommentThread } from "@/components/videos/CommentThread";
import { VersionList } from "@/components/videos/VersionList";
import { VideoStatusBadge } from "@/components/videos/VideoStatusBadge";
import {
  YoutubePlayer,
  type YoutubePlayerHandle,
} from "@/components/videos/YoutubePlayer";

const statuses = [
  { value: "to_edit", label: "To Edit" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
] as const;

export default function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const videoId = id as Id<"videos">;
  const router = useRouter();
  const video = useQuery(api.videos.getVideo, { videoId });
  const userOptions = useQuery(api.users.listUserOptions);
  const updateStatus = useMutation(api.videos.updateVideoStatus);
  const assignEditor = useMutation(api.videos.assignEditor);
  const deleteVideo = useMutation(api.videos.deleteVideo);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const playerRef = useRef<YoutubePlayerHandle>(null);

  const copyPath = async (path: string) => {
    await navigator.clipboard.writeText(path);
    toast.success("Storage path copied");
  };

  const handleStatusChange = async (status: "to_edit" | "in_progress" | "completed") => {
    try {
      await updateStatus({ videoId, status });
      toast.success("Status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    }
  };

  const handleAssignEditor = async (editorId: string) => {
    try {
      await assignEditor({
        videoId,
        editorId: editorId ? (editorId as Id<"users">) : undefined,
      });
      toast.success("Editor assignment updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign editor");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteVideo({ videoId });
      toast.success("Video deleted");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete video");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (video === undefined) {
    return <p className="text-muted-foreground">Loading video...</p>;
  }

  if (video === null) {
    return (
      <div className="space-y-4">
        <p>Video not found.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{video.title}</h1>
            <VideoStatusBadge status={video.status} />
          </div>
          <p className="text-muted-foreground">
            Uploaded by {video.uploaderUsername} ·{" "}
            {new Date(video.createdAt).toLocaleString()}
          </p>
        </div>
        {video.canDelete && (
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="size-4" />
                Delete video
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this video?</DialogTitle>
                <DialogDescription>
                  This will permanently remove the video, all versions, and comments.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void handleDelete()}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Storage path</CardTitle>
        </CardHeader>
        <CardContent className="flex items-start gap-2">
          <code className="flex-1 break-all rounded-md border bg-muted/40 p-3 font-mono text-sm">
            {video.storagePath}
          </code>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void copyPath(video.storagePath)}
          >
            <Copy className="size-4" />
          </Button>
        </CardContent>
      </Card>

      {video.youtubeUrl ? (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-start">
          <div className="min-w-0 space-y-3">
            <h2 className="text-xl font-semibold">YouTube preview</h2>
            <YoutubePlayer
              ref={playerRef}
              url={video.youtubeUrl}
              onReadyChange={setPlayerReady}
            />
            <a
              href={video.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary underline"
            >
              Open on YouTube
            </a>
          </div>

          <div className="flex min-h-[320px] flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)]">
            <h2 className="text-xl font-semibold">Comments</h2>
            <CommentThread
              videoId={videoId}
              status={video.status}
              hasYoutube={!!video.youtubeUrl}
              canMarkDone={video.canManage}
              playerRef={playerRef}
              playerReady={playerReady}
            />
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Comments</h2>
          <CommentThread
            videoId={videoId}
            status={video.status}
            hasYoutube={false}
            canMarkDone={video.canManage}
            playerRef={playerRef}
            playerReady={playerReady}
          />
        </section>
      )}

      {video.canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Workflow</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                value={video.status}
                onChange={(event) =>
                  void handleStatusChange(
                    event.target.value as "to_edit" | "in_progress" | "completed",
                  )
                }
              >
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editor">Assigned editor</Label>
              <select
                id="editor"
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                value={video.assignedEditorId ?? ""}
                onChange={(event) => void handleAssignEditor(event.target.value)}
              >
                <option value="">Unassigned</option>
                {userOptions?.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.username}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Versions</h2>
        <VersionList videoId={videoId} canManage={video.canManage} />
      </section>
    </div>
  );
}
