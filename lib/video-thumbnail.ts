import { extractYoutubeVideoId } from "@/lib/utils";

/** Editing workspace placeholder — sized for dashboard cards. */
export const DEFAULT_VIDEO_THUMBNAIL =
  "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=400&h=225&q=70";

/** Prefer smaller YouTube sizes — sharper at card scale, faster to load. */
const YOUTUBE_THUMBNAIL_SIZES = ["mqdefault", "hqdefault"] as const;

export function getYoutubeThumbnailCandidates(youtubeUrl: string): string[] {
  const videoId = extractYoutubeVideoId(youtubeUrl);
  if (!videoId) {
    return [];
  }

  return YOUTUBE_THUMBNAIL_SIZES.map(
    (size) => `https://i.ytimg.com/vi/${videoId}/${size}.jpg`,
  );
}

export function getVideoThumbnailCandidates(youtubeUrl?: string): string[] {
  if (youtubeUrl?.trim()) {
    const youtubeCandidates = getYoutubeThumbnailCandidates(youtubeUrl);
    if (youtubeCandidates.length > 0) {
      return [...youtubeCandidates, DEFAULT_VIDEO_THUMBNAIL];
    }
  }

  return [DEFAULT_VIDEO_THUMBNAIL];
}

/** YouTube serves a 120×90 placeholder when a size is missing — not a real 404. */
export function isYoutubePlaceholder(width: number, height: number): boolean {
  return width <= 120 && height <= 90;
}
