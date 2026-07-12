import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidYoutubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+/.test(
    url.trim(),
  );
}

export function extractYoutubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]+)/,
    /(?:youtube\.com\/embed\/)([\w-]+)/,
    /(?:youtube\.com\/shorts\/)([\w-]+)/,
    /(?:youtu\.be\/)([\w-]+)/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

export function truncatePath(path: string, maxLength = 48): string {
  if (path.length <= maxLength) {
    return path;
  }
  return `…${path.slice(-maxLength + 1)}`;
}
