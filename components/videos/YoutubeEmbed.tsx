import { extractYoutubeVideoId } from "@/lib/utils";

export function YoutubeEmbed({ url }: { url: string }) {
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) {
    return null;
  }

  return (
    <div className="aspect-video overflow-hidden rounded-lg border">
      <iframe
        className="h-full w-full"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video preview"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
