"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { VideoStatusBadge } from "@/components/videos/VideoStatusBadge";
import { VideoThumbnail } from "@/components/videos/VideoThumbnail";
import { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type VideoSummary = {
  _id: Doc<"videos">["_id"];
  title: string;
  youtubeUrl?: string;
  status: Doc<"videos">["status"];
  uploaderUsername: string;
  assignedEditorUsername: string | null;
  versionCount: number;
};

export function VideoCard({ video }: { video: VideoSummary }) {
  const showEditorTag =
    video.status === "to_edit" || video.status === "in_progress";

  return (
    <Card className="group overflow-hidden py-0 transition-shadow hover:shadow-md">
      <Link href={`/videos/${video._id}`} className="block">
        <div className="relative">
          <VideoThumbnail
            title={video.title}
            youtubeUrl={video.youtubeUrl}
            variant="card"
          />
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 bg-gradient-to-t from-black/75 via-black/40 to-transparent p-2 pt-8",
              !showEditorTag && "justify-end",
            )}
          >
            {(video.status === "to_edit" || video.status === "in_progress") && (
              <VideoStatusBadge
                status={video.status}
                className="border-white/20 bg-black/50 text-white backdrop-blur-sm"
              />
            )}
            {video.status === "completed" && (
              <VideoStatusBadge status="completed" className="ml-auto" />
            )}
            {showEditorTag && (
              <Badge
                variant="outline"
                className="border-white/25 bg-black/50 text-white backdrop-blur-sm"
              >
                <UserRound className="size-3" />
                {video.assignedEditorUsername ?? "Unassigned"}
              </Badge>
            )}
          </div>
        </div>
        <CardContent className="space-y-0.5 p-3">
          <h3 className="line-clamp-2 text-sm leading-snug font-semibold group-hover:underline">
            {video.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            by {video.uploaderUsername} · {video.versionCount} version
            {video.versionCount === 1 ? "" : "s"}
          </p>
        </CardContent>
      </Link>
    </Card>
  );
}
