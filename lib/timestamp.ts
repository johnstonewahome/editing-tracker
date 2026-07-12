const MAX_TIMESTAMP_SECONDS = 86400;

export function formatTimestamp(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function parseTimestamp(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split(":").map((part) => part.trim());
  if (parts.some((part) => part === "" || !/^\d+$/.test(part))) {
    return null;
  }

  let totalSeconds = 0;

  if (parts.length === 1) {
    totalSeconds = Number(parts[0]);
  } else if (parts.length === 2) {
    const [minutes, seconds] = parts.map(Number);
    totalSeconds = minutes * 60 + seconds;
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts.map(Number);
    totalSeconds = hours * 3600 + minutes * 60 + seconds;
  } else {
    return null;
  }

  if (
    !Number.isFinite(totalSeconds) ||
    totalSeconds < 0 ||
    totalSeconds > MAX_TIMESTAMP_SECONDS ||
    !Number.isInteger(totalSeconds)
  ) {
    return null;
  }

  return totalSeconds;
}

export function validateTimestampSeconds(seconds: number): void {
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > MAX_TIMESTAMP_SECONDS) {
    throw new Error("Timestamp must be between 0:00 and 24:00:00");
  }
}
