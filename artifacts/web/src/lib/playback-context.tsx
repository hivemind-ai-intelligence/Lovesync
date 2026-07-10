import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useSocket } from "@/lib/socket";
import { QueueSong, useGetQueue } from "@workspace/api-client-react";
import { getGetQueueQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface PlaybackState {
  queueSongId: number | null;
  videoId: string | null;
  isPlaying: boolean;
  positionSeconds: number;
  updatedAt: number;
}

interface PlaybackContextType {
  playbackState: PlaybackState;
  updatePlayback: (updates: Partial<PlaybackState>) => void;
  broadcastQueueChange: () => void;
}

const PlaybackContext = createContext<PlaybackContextType | null>(null);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const socket = useSocket();
  const queryClient = useQueryClient();
  
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    queueSongId: null,
    videoId: null,
    isPlaying: false,
    positionSeconds: 0,
    updatedAt: Date.now(),
  });

  const lastUpdateSentAt = useRef(0);

  useEffect(() => {
    if (!socket) return;

    const handleSync = (state: PlaybackState) => {
      setPlaybackState((prev) => ({
        ...prev,
        ...state,
      }));
    };

    const handleQueueChanged = () => {
      queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
    };

    socket.on("playback:sync", handleSync);
    socket.on("queue:changed", handleQueueChanged);

    return () => {
      socket.off("playback:sync", handleSync);
      socket.off("queue:changed", handleQueueChanged);
    };
  }, [socket, queryClient]);

  const updatePlayback = (updates: Partial<PlaybackState>) => {
    // Optimistic update
    const newState = {
      ...playbackState,
      ...updates,
      updatedAt: Date.now()
    };
    setPlaybackState(newState);

    if (socket) {
      // Throttle rapid updates slightly
      const now = Date.now();
      if (now - lastUpdateSentAt.current > 100 || 'queueSongId' in updates || 'isPlaying' in updates) {
        socket.emit("playback:update", updates);
        lastUpdateSentAt.current = now;
      }
    }
  };

  const broadcastQueueChange = () => {
    if (socket) {
      socket.emit("queue:changed");
    }
  };

  return (
    <PlaybackContext.Provider value={{ playbackState, updatePlayback, broadcastQueueChange }}>
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) {
    throw new Error("usePlayback must be used within PlaybackProvider");
  }
  return ctx;
}
