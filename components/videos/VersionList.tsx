"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function VersionList({
  videoId,
  canManage,
}: {
  videoId: Id<"videos">;
  canManage: boolean;
}) {
  const versions = useQuery(api.versions.listVersions, { videoId });
  const addVersion = useMutation(api.versions.addVersion);
  const [storagePath, setStoragePath] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await addVersion({
        videoId,
        storagePath,
        youtubeUrl: youtubeUrl || undefined,
        notes: notes || undefined,
      });
      setStoragePath("");
      setYoutubeUrl("");
      setNotes("");
      toast.success("Version added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add version");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (versions === undefined) {
    return <p className="text-sm text-muted-foreground">Loading versions...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No versions yet.</p>
        ) : (
          versions.map((version) => (
            <Card key={version._id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Version {version.versionNumber}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Path:</span>{" "}
                  <code className="break-all font-mono text-xs">
                    {version.storagePath}
                  </code>
                </p>
                {version.youtubeUrl && (
                  <p>
                    <span className="font-medium">YouTube:</span>{" "}
                    <a
                      href={version.youtubeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      {version.youtubeUrl}
                    </a>
                  </p>
                )}
                {version.notes && (
                  <p>
                    <span className="font-medium">Notes:</span> {version.notes}
                  </p>
                )}
                <p className="text-muted-foreground">
                  {version.authorUsername} ·{" "}
                  {new Date(version.createdAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add version</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="version-path">Storage path</Label>
                <Input
                  id="version-path"
                  value={storagePath}
                  onChange={(event) => setStoragePath(event.target.value)}
                  placeholder="/Volumes/Projects/client/video_v2.mov"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="version-youtube">YouTube URL (optional)</Label>
                <Input
                  id="version-youtube"
                  value={youtubeUrl}
                  onChange={(event) => setYoutubeUrl(event.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="version-notes">Notes (optional)</Label>
                <Textarea
                  id="version-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="What changed in this version?"
                />
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Add version"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
