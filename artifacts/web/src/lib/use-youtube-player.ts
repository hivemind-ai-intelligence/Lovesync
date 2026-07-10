import { useEffect, useRef, useState } from "react";
import { loadYouTubeAPI } from "./youtube";

type PlayerState = "UNSTARTED" | "ENDED" | "PLAYING" | "PAUSED" | "BUFFERING" | "CUED";

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
  const playerRef = useRef<any>(null);
  const [isApiReady, setIsApiReady] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  
  // Track if we're currently seeking to avoid double-firing events
  const isSeekingRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    loadYouTubeAPI().then(() => {
      if (mounted) setIsApiReady(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!isApiReady || !containerRef.current) return;

    if (!playerRef.current) {
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '100%',
        width: '100%',
        videoId: videoId || '',
        playerVars: {
          autoplay: isPlaying ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
        },
        events: {
          onReady: (e: any) => {
            setIsPlayerReady(true);
            onReady();
            if (positionSeconds > 0) {
              e.target.seekTo(positionSeconds, true);
            }
          },
          onStateChange: (e: any) => {
            const states: Record<number, PlayerState> = {
              [-1]: "UNSTARTED",
              [0]: "ENDED",
              [1]: "PLAYING",
              [2]: "PAUSED",
              [3]: "BUFFERING",
              [5]: "CUED"
            };
            const state = states[e.data];
            if (state) onStateChange(state);
          },
          onError: (e: any) => {
            onError(e.data);
          }
        }
      });
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
        setIsPlayerReady(false);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApiReady]);

  // Handle Video ID change
  useEffect(() => {
    if (isPlayerReady && playerRef.current && videoId) {
      const currentVideoId = playerRef.current.getVideoData()?.video_id;
      if (currentVideoId !== videoId) {
        playerRef.current.loadVideoById({
          videoId: videoId,
          startSeconds: positionSeconds
        });
      }
    }
  }, [videoId, isPlayerReady]); // deliberately omitting positionSeconds to avoid reloading on position sync

  // Handle Play/Pause change
  useEffect(() => {
    if (isPlayerReady && playerRef.current) {
      const playerState = playerRef.current.getPlayerState();
      
      if (isPlaying && playerState !== 1 && playerState !== 3) {
        playerRef.current.playVideo();
      } else if (!isPlaying && playerState === 1) {
        playerRef.current.pauseVideo();
      }
    }
  }, [isPlaying, isPlayerReady]);

  // Handle Time sync
  useEffect(() => {
    if (isPlayerReady && playerRef.current) {
      const currentTime = playerRef.current.getCurrentTime() || 0;
      const diff = Math.abs(currentTime - positionSeconds);
      
      // If we are more than 2 seconds out of sync, seek to the target time
      if (diff > 2 && !isSeekingRef.current) {
        isSeekingRef.current = true;
        playerRef.current.seekTo(positionSeconds, true);
        setTimeout(() => { isSeekingRef.current = false; }, 500);
      }
    }
  }, [positionSeconds, isPlayerReady]);

  // Continuous position polling
  useEffect(() => {
    if (!isPlayerReady) return;
    
    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getPlayerState() === 1) {
        onPositionChange(playerRef.current.getCurrentTime() || 0);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isPlayerReady, onPositionChange]);

  const seekTo = (seconds: number) => {
    if (isPlayerReady && playerRef.current) {
      isSeekingRef.current = true;
      playerRef.current.seekTo(seconds, true);
      onPositionChange(seconds);
      setTimeout(() => { isSeekingRef.current = false; }, 500);
    }
  };

  const setVolume = (volume: number) => {
    if (isPlayerReady && playerRef.current) {
      playerRef.current.setVolume(volume);
    }
  };

  return { containerRef, seekTo, setVolume, isReady: isPlayerReady };
}
