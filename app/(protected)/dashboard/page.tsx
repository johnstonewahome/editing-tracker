"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoCard } from "@/components/videos/VideoCard";

function VideoGrid({
  videos,
  emptyMessage,
  showRegisterCta = false,
}: {
  videos: React.ComponentProps<typeof VideoCard>["video"][] | undefined;
  emptyMessage: string;
  showRegisterCta?: boolean;
}) {
  if (videos === undefined) {
    return <p className="text-sm text-muted-foreground">Loading videos...</p>;
  }

  if (videos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
        {showRegisterCta && (
          <Button asChild className="mt-4">
            <Link href="/videos/new">Register a video</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,260px))]">
      {videos.map((video) => (
        <VideoCard key={video._id} video={video} />
      ))}
    </div>
  );
}

function ActiveVideoList() {
  const videos = useQuery(api.videos.listActiveVideos);

  return (
    <VideoGrid
      videos={videos}
      emptyMessage="No videos to edit or in progress right now."
      showRegisterCta
    />
  );
}

function CompletedVideoList() {
  const videos = useQuery(api.videos.listVideos, { status: "completed" });

  return (
    <VideoGrid
      videos={videos}
      emptyMessage="No completed videos yet."
    />
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Active edits and completed projects in one place.
          </p>
        </div>
        <Button asChild>
          <Link href="/videos/new">
            <Plus className="size-4" />
            New video
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-6">
          <ActiveVideoList />
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
          <CompletedVideoList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
