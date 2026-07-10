import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useSocket } from "@/lib/socket";
import { getGetQueueQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export type RepeatMode = "off" | "one" | "all";

export interface PlaybackState {
  queueSongId: number | null;
  videoId: string | null;
  isPlaying: boolean;
  positionSeconds: number;
  updatedAt: number;
  shuffle: boolean;
  repeat: RepeatMode;
}

interface PlaybackContextType {
  playbackState: PlaybackState;
  updatePlayback: (updates: Partial<PlaybackState>) => void;
  broadcastQueueChange: () => void;
  connectedUsers: string[];
  toggleShuffle: () => void;
  cycleRepeat: () => void;
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
    shuffle: false,
    repeat: "off",
  });

  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const lastUpdateSentAt = useRef(0);

  // Keep a stable ref so event handlers always see the latest state
  const playbackStateRef = useRef(playbackState);
  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);

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

    const handleUsersUpdate = (users: string[]) => {
      setConnectedUsers(users);
    };

    socket.on("playback:sync", handleSync);
    socket.on("queue:changed", handleQueueChanged);
    socket.on("users:update", handleUsersUpdate);

    return () => {
      socket.off("playback:sync", handleSync);
      socket.off("queue:changed", handleQueueChanged);
      socket.off("users:update", handleUsersUpdate);
    };
  }, [socket, queryClient]);

  const updatePlayback = (updates: Partial<PlaybackState>) => {
    const newState: PlaybackState = {
      ...playbackStateRef.current,
      ...updates,
      updatedAt: Date.now(),
    };
    setPlaybackState(newState);
    playbackStateRef.current = newState;

    if (socket) {
      const now = Date.now();
      const isSignificant =
        "queueSongId" in updates ||
        "isPlaying" in updates ||
        "shuffle" in updates ||
        "repeat" in updates;
      if (isSignificant || now - lastUpdateSentAt.current > 100) {
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

  const toggleShuffle = () => {
    updatePlayback({ shuffle: !playbackStateRef.current.shuffle });
  };

  const cycleRepeat = () => {
    const modes: RepeatMode[] = ["off", "all", "one"];
    const currentIndex = modes.indexOf(playbackStateRef.current.repeat);
    const next = modes[(currentIndex + 1) % modes.length];
    updatePlayback({ repeat: next });
  };

  return (
    <PlaybackContext.Provider
      value={{
        playbackState,
        updatePlayback,
        broadcastQueueChange,
        connectedUsers,
        toggleShuffle,
        cycleRepeat,
      }}
    >
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
