"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Film } from "lucide-react";
import {
  DEFAULT_VIDEO_THUMBNAIL,
  getVideoThumbnailCandidates,
  isYoutubePlaceholder,
} from "@/lib/video-thumbnail";
import { cn } from "@/lib/utils";

type VideoThumbnailProps = {
  title: string;
  youtubeUrl?: string;
  className?: string;
  priority?: boolean;
  variant?: "card" | "large";
};

export function VideoThumbnail({
  title,
  youtubeUrl,
  className,
  priority = false,
  variant = "card",
}: VideoThumbnailProps) {
  const candidates = useMemo(
    () => getVideoThumbnailCandidates(youtubeUrl),
    [youtubeUrl],
  );
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [showFallback, setShowFallback] = useState(false);

  const src = candidates[candidateIndex] ?? DEFAULT_VIDEO_THUMBNAIL;

  const tryNextCandidate = () => {
    if (candidateIndex < candidates.length - 1) {
      setCandidateIndex((index) => index + 1);
      return;
    }
    setShowFallback(true);
  };

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-muted",
        variant === "card" ? "h-32" : "aspect-video",
        className,
      )}
    >
      {showFallback ? (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-zinc-400">
          <Film className={variant === "card" ? "size-8" : "size-10"} />
        </div>
      ) : (
        <Image
          src={src}
          alt={`${title} thumbnail`}
          fill
          priority={priority}
          sizes={
            variant === "card"
              ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
              : "(max-width: 768px) 100vw, 50vw"
          }
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          onLoad={(event) => {
            const img = event.currentTarget;
            if (isYoutubePlaceholder(img.naturalWidth, img.naturalHeight)) {
              tryNextCandidate();
            }
          }}
          onError={tryNextCandidate}
        />
      )}
    </div>
  );
}
