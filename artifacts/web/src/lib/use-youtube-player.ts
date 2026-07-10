import { useEffect, useRef, useState, useCallback } from "react";
import { loadYouTubeAPI } from "./youtube";

// Minimal type declarations for the YouTube IFrame API
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  getVolume(): number;
  getCurrentTime(): number;
  getPlayerState(): number;
  getVideoData(): { video_id: string; title: string };
  loadVideoById(options: { videoId: string; startSeconds?: number }): void;
  destroy(): void;
}

type PlayerState = "UNSTARTED" | "ENDED" | "PLAYING" | "PAUSED" | "BUFFERING" | "CUED";

const YT_STATE_MAP: Record<number, PlayerState> = {
  [-1]: "UNSTARTED",
  [0]: "ENDED",
  [1]: "PLAYING",
  [2]: "PAUSED",
  [3]: "BUFFERING",
  [5]: "CUED",
};

interface UseYouTubePlayerProps {
  videoId: string | null;
  isPlaying: boolean;
  positionSeconds: number;
  onPositionChange: (time: number) => void;
  onStateChange: (state: PlayerState) => void;
  onError: (error: number) => void;
  onReady: () => void;
}

export function useYouTubePlayer({
  videoId,
  isPlaying,
  positionSeconds,
  onPositionChange,
  onStateChange,
  onError,
  onReady,
}: UseYouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [isApiReady, setIsApiReady] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const isSeekingRef = useRef(false);

  // Use stable refs so player event callbacks don't capture stale values
  const onStateChangeRef = useRef(onStateChange);
  const onErrorRef = useRef(onError);
  const onReadyRef = useRef(onReady);
  const onPositionChangeRef = useRef(onPositionChange);
  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { onPositionChangeRef.current = onPositionChange; }, [onPositionChange]);

  // Load the YouTube IFrame API
  useEffect(() => {
    let mounted = true;
    loadYouTubeAPI().then(() => {
      if (mounted) setIsApiReady(true);
    });
    return () => { mounted = false; };
  }, []);

  // Create the player once the API is ready
  useEffect(() => {
    if (!isApiReady || !containerRef.current) return;
    if (playerRef.current) return; // already created

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    playerRef.current = new (window as any).YT.Player(containerRef.current, {
      height: "100%",
      width: "100%",
      videoId: videoId ?? "",
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        playsinline: 1,
      },
      events: {
        onReady: (e: { target: YTPlayer }) => {
          setIsPlayerReady(true);
          onReadyRef.current();
          if (positionSeconds > 0) {
            e.target.seekTo(positionSeconds, true);
          }
        },
        onStateChange: (e: { data: number }) => {
          const state = YT_STATE_MAP[e.data];
          if (state) onStateChangeRef.current(state);
        },
        onError: (e: { data: number }) => {
          onErrorRef.current(e.data);
        },
      },
    }) as YTPlayer;

    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
        setIsPlayerReady(false);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApiReady]);

  // Handle Video ID changes
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    const player = playerRef.current;
    const currentVideoId = player.getVideoData()?.video_id;
    if (videoId && currentVideoId !== videoId) {
      player.loadVideoById({ videoId, startSeconds: 0 });
    } else if (!videoId && currentVideoId) {
      // Clear player by loading nothing — just pause
      player.pauseVideo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, isPlayerReady]);

  // Handle play/pause changes
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    const player = playerRef.current;
    const playerState = player.getPlayerState();
    if (isPlaying && playerState !== 1 && playerState !== 3) {
      player.playVideo();
    } else if (!isPlaying && playerState === 1) {
      player.pauseVideo();
    }
  }, [isPlaying, isPlayerReady]);

  // Handle time sync — only seek if significantly out of sync
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current || isSeekingRef.current) return;
    const currentTime = playerRef.current.getCurrentTime() ?? 0;
    const diff = Math.abs(currentTime - positionSeconds);
    if (diff > 2) {
      isSeekingRef.current = true;
      playerRef.current.seekTo(positionSeconds, true);
      setTimeout(() => { isSeekingRef.current = false; }, 800);
    }
  }, [positionSeconds, isPlayerReady]);

  // Continuous position polling (while playing)
  useEffect(() => {
    if (!isPlayerReady) return;
    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getPlayerState() === 1) {
        onPositionChangeRef.current(playerRef.current.getCurrentTime() ?? 0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlayerReady]);

  const seekTo = useCallback((seconds: number) => {
    if (isPlayerReady && playerRef.current) {
      isSeekingRef.current = true;
      playerRef.current.seekTo(seconds, true);
      onPositionChangeRef.current(seconds);
      setTimeout(() => { isSeekingRef.current = false; }, 800);
    }
  }, [isPlayerReady]);

  const setVolume = useCallback((volume: number) => {
    if (isPlayerReady && playerRef.current) {
      playerRef.current.setVolume(volume);
    }
  }, [isPlayerReady]);

  return { containerRef, seekTo, setVolume, isReady: isPlayerReady };
}
