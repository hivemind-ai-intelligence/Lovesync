declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    if (firstScriptTag && firstScriptTag.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
      document.head.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => {
      resolve();
    };
  });
}

export function formatDuration(isoDuration: string | null): string {
  if (!isoDuration) return "Live";
  const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return "Unknown";

  const hours = (match[1] || "").replace("H", "");
  const minutes = (match[2] || "").replace("M", "");
  const seconds = (match[3] || "").replace("S", "");

  const parts = [];
  if (hours) parts.push(hours);
  parts.push(minutes ? minutes.padStart(2, "0") : "00");
  parts.push(seconds ? seconds.padStart(2, "0") : "00");

  if (parts.length === 2 && !hours && parts[0] === "00") {
    parts[0] = "0";
  }

  return parts.join(":");
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}
