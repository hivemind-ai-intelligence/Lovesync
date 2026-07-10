import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseDurationToSeconds(isoDuration: string | null): number {
  if (!isoDuration) return 0;
  
  const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;

  const hours = parseInt((match[1] || "").replace("H", "")) || 0;
  const minutes = parseInt((match[2] || "").replace("M", "")) || 0;
  const seconds = parseInt((match[3] || "").replace("S", "")) || 0;

  return (hours * 3600) + (minutes * 60) + seconds;
}
