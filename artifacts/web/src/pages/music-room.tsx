import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import {
  useGetMe,
  useGetQueue,
  useAddQueueSong,
  useRemoveQueueSong,
  useReorderQueue,
  getGetQueueQueryKey,
  type QueueSong,
  type YoutubeResult,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, LogOut, Heart, Radio, Music2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clearToken } from "@/lib/auth";
import { PlaybackProvider, usePlayback } from "@/lib/playback-context";
import { useYouTubePlayer } from "@/lib/use-youtube-player";
import { PlayerControls } from "@/components/player-controls";
import { SearchPanel } from "@/components/search-panel";
import { QueuePanel } from "@/components/queue-panel";
import { parseDurationToSeconds } from "@/lib/utils";

export default function MusicRoomWrapper() {
  return (
    <PlaybackProvider>
      <MusicRoom />
    </PlaybackProvider>
  );
}

/** Extract a hue (0-360) from a video ID — deterministic, no canvas needed */
function videoIdToHue(videoId: string | null): number {
  if (!videoId) return 280;
  let h = 0;
  for (let i = 0; i < videoId.length; i++) {
    h = (h * 37 + videoId.charCodeAt(i)) & 0xffff;
  }
  return h % 360;
}

/** Get the highest-res thumbnail URL */
function hiResThumbnail(videoId: string, fallback: string): string {
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
}

function MusicRoom() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    playbackState,
    updatePlayback,
    broadcastQueueChange,
    connectedUsers,
    toggleShuffle,
    cycleRepeat,
  } = usePlayback();

  // Auth guard
  const { data: me, isError: authError, isLoading: meLoading } = useGetMe();
  useEffect(() => {
    if (authError) { clearToken(); setLocation("/login"); }
  }, [authError, setLocation]);

  // Queue data
  const { data: queue = [] } = useGetQueue();
  const addSong = useAddQueueSong();
  const removeSong = useRemoveQueueSong();
  const reorderQueue = useReorderQueue();

  const [addingId, setAddingId] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem("ourroom_volume");
    return saved !== null ? Number(saved) : 80;
  });
  // Track previous volume for crossfade artwork
  const [displaySong, setDisplaySong] = useState<QueueSong | null>(null);

  // Derived state
  const currentSongIndex = useMemo(() => {
    if (!playbackState.queueSongId) return -1;
    return queue.findIndex((s) => s.id === playbackState.queueSongId);
  }, [queue, playbackState.queueSongId]);

  const currentSong = currentSongIndex >= 0 ? queue[currentSongIndex] : null;

  // Keep displaySong slightly behind so artwork never vanishes mid-transition
  useEffect(() => {
    if (currentSong) setDisplaySong(currentSong);
  }, [currentSong]);

  const durationSecs = useMemo(
    () => (displaySong ? parseDurationToSeconds(displaySong.duration) : 0),
    [displaySong]
  );

  // Persist volume — NOT memoized: must always call the current player.setVolume
  const handleVolumeChange = (v: number) => {
    setVolume(v);
    localStorage.setItem("ourroom_volume", String(v));
    player.setVolume(v);
  };

  // ── Player controls ──────────────────────────────────────────────────────

  const safeRemove = useCallback((id: number) => {
    removeSong.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
          broadcastQueueChange();
        },
      }
    );
  }, [removeSong, queryClient, broadcastQueueChange]);

  const handleSkip = useCallback(() => {
    if (playbackState.repeat === "one") {
      // Restart the current song
      player.seekTo(0);
      updatePlayback({ positionSeconds: 0, isPlaying: true });
      return;
    }

    const queueSnapshot = queue;
    let nextIndex: number;

    if (playbackState.shuffle && queueSnapshot.length > 1) {
      // Pick a random song that isn't the current one
      let rnd: number;
      do { rnd = Math.floor(Math.random() * queueSnapshot.length); }
      while (rnd === currentSongIndex);
      nextIndex = rnd;
    } else {
      nextIndex = currentSongIndex + 1;
    }

    if (nextIndex < queueSnapshot.length) {
      const nextSong = queueSnapshot[nextIndex];
      updatePlayback({ queueSongId: nextSong.id, videoId: nextSong.videoId, isPlaying: true, positionSeconds: 0 });
    } else if (playbackState.repeat === "all" && queueSnapshot.length > 0) {
      // Wrap around
      const first = queueSnapshot[0];
      updatePlayback({ queueSongId: first.id, videoId: first.videoId, isPlaying: true, positionSeconds: 0 });
    } else {
      updatePlayback({ isPlaying: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, currentSongIndex, playbackState.shuffle, playbackState.repeat, updatePlayback]);

  const handlePrev = useCallback(() => {
    // If > 3 s into song, restart it
    if (playbackState.positionSeconds > 3) {
      player.seekTo(0);
      updatePlayback({ positionSeconds: 0 });
      return;
    }
    if (currentSongIndex > 0) {
      const prev = queue[currentSongIndex - 1];
      updatePlayback({ queueSongId: prev.id, videoId: prev.videoId, isPlaying: true, positionSeconds: 0 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, currentSongIndex, playbackState.positionSeconds, updatePlayback]);

  const handlePlayPause = (play: boolean) => {
    if (!currentSong && play && queue.length > 0) {
      const first = queue[0];
      updatePlayback({ queueSongId: first.id, videoId: first.videoId, isPlaying: true, positionSeconds: 0 });
    } else {
      updatePlayback({ isPlaying: play });
    }
  };

  const handleSeek = (seconds: number) => {
    updatePlayback({ positionSeconds: seconds });
    player.seekTo(seconds);
  };

  const handleRemove = (id: number) => {
    if (id === playbackState.queueSongId) {
      const nextIndex = currentSongIndex + 1;
      if (nextIndex < queue.length) {
        const next = queue[nextIndex];
        updatePlayback({ queueSongId: next.id, videoId: next.videoId, isPlaying: true, positionSeconds: 0 });
      } else {
        updatePlayback({ queueSongId: null, videoId: null, isPlaying: false, positionSeconds: 0 });
      }
    }
    safeRemove(id);
  };

  const handleClearQueue = () => {
    queue.forEach((s) => safeRemove(s.id));
    updatePlayback({ queueSongId: null, videoId: null, isPlaying: false, positionSeconds: 0 });
  };

  const handleReorder = (orderedIds: number[]) => {
    queryClient.setQueryData(getGetQueueQueryKey(), (old: QueueSong[]) => {
      if (!old) return old;
      const map = new Map(old.map((s) => [s.id, s]));
      return orderedIds.map((id) => map.get(id)!).filter(Boolean);
    });
    reorderQueue.mutate(
      { data: { orderedIds } },
      {
        onSuccess: () => broadcastQueueChange(),
        onError: () => {
          queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
          toast({ title: "Reorder failed", variant: "destructive" });
        },
      }
    );
  };

  const handlePlayFromQueue = (songId: number) => {
    const song = queue.find((s) => s.id === songId);
    if (song) {
      updatePlayback({ queueSongId: song.id, videoId: song.videoId, isPlaying: true, positionSeconds: 0 });
    }
  };

  // ── Add / Play Now ────────────────────────────────────────────────────────

  const handleAdd = (video: YoutubeResult) => {
    setAddingId(video.videoId);
    addSong.mutate(
      { data: { ...video, duration: video.duration ?? "" } },
      {
        onSuccess: (newSong) => {
          queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
          broadcastQueueChange();
          if (!playbackState.isPlaying && !playbackState.videoId) {
            updatePlayback({ queueSongId: newSong.id, videoId: newSong.videoId, isPlaying: true, positionSeconds: 0 });
          }
        },
        onSettled: () => setAddingId(null),
      }
    );
  };

  const handlePlayNow = (video: YoutubeResult) => {
    setAddingId(video.videoId);
    addSong.mutate(
      { data: { ...video, duration: video.duration ?? "" } },
      {
        onSuccess: (newSong) => {
          queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
          broadcastQueueChange();
          updatePlayback({ queueSongId: newSong.id, videoId: newSong.videoId, isPlaying: true, positionSeconds: 0 });
        },
        onSettled: () => setAddingId(null),
      }
    );
  };

  // ── YouTube Player ────────────────────────────────────────────────────────

  const player = useYouTubePlayer({
    videoId: playbackState.videoId,
    isPlaying: playbackState.isPlaying,
    positionSeconds: playbackState.positionSeconds,
    onPositionChange: (time) => {
      if (playbackState.isPlaying) updatePlayback({ positionSeconds: time });
    },
    onStateChange: (state) => {
      if (state === "ENDED") handleSkip();
      else if (state === "PLAYING" && !playbackState.isPlaying) updatePlayback({ isPlaying: true });
      else if (state === "PAUSED" && playbackState.isPlaying) updatePlayback({ isPlaying: false });
    },
    onError: () => {
      toast({ title: "Playback Error", description: "Skipping unplayable video.", variant: "destructive" });
      handleSkip();
    },
    onReady: () => { player.setVolume(volume); },
  });

  // ── Together status ───────────────────────────────────────────────────────
  const together = connectedUsers.length >= 2;

  // ── Dynamic background ────────────────────────────────────────────────────
  const hue = videoIdToHue(displaySong?.videoId ?? null);
  const thumbnailUrl = displaySong
    ? hiResThumbnail(displaySong.videoId, displaySong.thumbnail)
    : null;

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (meLoading || !me) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden flex flex-col md:flex-row text-foreground bg-[hsl(240,30%,5%)]">

      {/* ── Dynamic aurora background ──────────────────────────────────────── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Blurred thumbnail backdrop */}
        <AnimatePresence mode="sync">
          {thumbnailUrl && (
            <motion.div
              key={displaySong?.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.18 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="absolute inset-0 scale-110"
              style={{
                backgroundImage: `url(${thumbnailUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(40px) saturate(1.4)",
              }}
              onError={() => {/* fallback handled by displaySong thumbnail */}}
            />
          )}
        </AnimatePresence>

        {/* Colour blobs that shift hue with the song */}
        <motion.div
          className="aurora-blob"
          animate={{ "--hue": `${hue}deg` } as Record<string, string>}
          transition={{ duration: 2 }}
          style={{
            background: `radial-gradient(ellipse at 30% 20%, hsla(${hue},70%,50%,0.18) 0%, transparent 65%)`,
          }}
        />
        <motion.div
          animate={{
            background: `radial-gradient(ellipse at 70% 80%, hsla(${(hue + 40) % 360},60%,45%,0.14) 0%, transparent 60%)`
          }}
          transition={{ duration: 2.5 }}
          className="absolute inset-0"
        />

        {/* Noise overlay for film-grain texture */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC42NSIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMC4wMyIvPjwvc3ZnPg==')] opacity-40" />

        {/* Dark gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(240,30%,4%)]/95 via-[hsl(240,28%,5%)]/85 to-[hsl(240,30%,4%)]/90" />
      </div>

      {/* Hidden YouTube player */}
      <div className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden" ref={player.containerRef} />

      {/* ── LEFT PANEL ────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col gap-6 p-5 md:p-8 lg:p-10 min-h-[60vh] md:min-h-screen">

        {/* Header */}
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-1.5 h-1.5 rounded-full bg-primary"
            />
            <span className="font-display tracking-[0.25em] text-sm text-white/60 uppercase">
              OurRoom
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Together indicator */}
            <motion.div
              initial={false}
              animate={{ opacity: 1 }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors duration-700 ${
                together
                  ? "border-primary/25 text-primary/80 bg-primary/8"
                  : "border-white/10 text-white/25 bg-transparent"
              }`}
            >
              {together
                ? <><Heart className="w-3 h-3 fill-current" /><span>Together</span></>
                : <><Radio className="w-3 h-3" /><span>Solo</span></>
              }
            </motion.div>

            <button
              onClick={() => { clearToken(); setLocation("/login"); }}
              className="text-white/20 hover:text-white/60 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Artwork */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-full max-w-[340px] aspect-square">
            <AnimatePresence mode="sync">
              {displaySong ? (
                <motion.div
                  key={displaySong.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute inset-0"
                >
                  {/* Disc ring glow */}
                  <motion.div
                    className="absolute inset-[-12%] rounded-full"
                    animate={{
                      boxShadow: playbackState.isPlaying
                        ? `0 0 60px 20px hsla(${hue},60%,50%,0.2)`
                        : `0 0 0px 0px hsla(${hue},60%,50%,0)`,
                    }}
                    transition={{ duration: 1.5 }}
                  />

                  {/* Spinning disc */}
                  <motion.div
                    className="w-full h-full rounded-full overflow-hidden"
                    style={{
                      boxShadow: "0 20px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.06)",
                    }}
                    animate={{ rotate: playbackState.isPlaying ? 360 : 0 }}
                    transition={
                      playbackState.isPlaying
                        ? { duration: 18, ease: "linear", repeat: Infinity }
                        : { duration: 1, ease: "easeOut" }
                    }
                  >
                    <img
                      src={hiResThumbnail(displaySong.videoId, displaySong.thumbnail)}
                      alt="Artwork"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = displaySong.thumbnail;
                      }}
                    />
                    {/* Vinyl center */}
                    <div className="absolute inset-0 rounded-full" style={{
                      background: "radial-gradient(circle, rgba(0,0,0,0.6) 0%, transparent 30%, rgba(0,0,0,0.15) 100%)"
                    }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[hsl(240,30%,6%)] shadow-inner border border-white/5" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/20" />
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full rounded-full glass-card flex flex-col items-center justify-center border-dashed"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                  <Music2 className="w-12 h-12 text-white/10 mb-3" />
                  <p className="text-sm text-white/20 font-light text-center px-6">
                    Search for a song to start listening together
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Song info */}
        <div className="text-center min-h-[60px]">
          <AnimatePresence mode="wait">
            {displaySong ? (
              <motion.div
                key={displaySong.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                <h2 className="text-xl font-display font-medium text-white/90 truncate leading-snug">
                  {displaySong.title}
                </h2>
                <p className="text-sm text-white/40 mt-1 font-light truncate">
                  {displaySong.channel}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="empty-info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-white/15 font-light"
              >
                Nothing playing
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Player Controls */}
        <PlayerControls
          isPlaying={playbackState.isPlaying}
          onPlayPause={handlePlayPause}
          positionSeconds={playbackState.positionSeconds}
          durationSeconds={durationSecs}
          onSeek={handleSeek}
          onSkip={handleSkip}
          onPrev={handlePrev}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          shuffle={playbackState.shuffle}
          onToggleShuffle={toggleShuffle}
          repeat={playbackState.repeat}
          onCycleRepeat={cycleRepeat}
          hasSong={!!currentSong}
        />
      </div>

      {/* ── RIGHT PANEL ───────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full md:w-[380px] lg:w-[440px] shrink-0 flex flex-col gap-3 p-3 md:p-4 h-[50vh] md:h-[100dvh] border-t md:border-t-0 md:border-l border-white/[0.04]" style={{ background: "rgba(10,10,18,0.55)", backdropFilter: "blur(32px)" }}>
        <SearchPanel
          onAdd={handleAdd}
          onPlayNow={handlePlayNow}
          isAdding={addSong.isPending}
          addingId={addingId}
        />
        <QueuePanel
          queue={queue}
          currentSongId={playbackState.queueSongId}
          onRemove={handleRemove}
          onReorder={handleReorder}
          onPlay={handlePlayFromQueue}
          onClear={handleClearQueue}
        />
      </div>
    </div>
  );
}
