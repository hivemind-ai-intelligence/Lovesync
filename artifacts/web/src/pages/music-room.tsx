import { useEffect, useState, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { 
  useGetMe, 
  useGetQueue, 
  useAddQueueSong, 
  useRemoveQueueSong, 
  useReorderQueue,
  getGetQueueQueryKey, 
  QueueSong
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { clearToken } from "@/lib/auth";

import { PlaybackProvider, usePlayback } from "@/lib/playback-context";
import { useYouTubePlayer } from "@/lib/use-youtube-player";
import { PlayerControls } from "@/components/player-controls";
import { SearchPanel } from "@/components/search-panel";
import { QueuePanel } from "@/components/queue-panel";
import { Loader2, LogOut } from "lucide-react";
import { parseDurationToSeconds } from "@/lib/utils";

// Wrap main component to provide context
export default function MusicRoomWrapper() {
  return (
    <PlaybackProvider>
      <MusicRoom />
    </PlaybackProvider>
  );
}

function MusicRoom() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { playbackState, updatePlayback, broadcastQueueChange } = usePlayback();
  
  // Guard route
  const { data: me, isError: authError, isLoading: meLoading } = useGetMe();
  
  useEffect(() => {
    if (authError) {
      clearToken();
      setLocation("/login");
    }
  }, [authError, setLocation]);

  // Data hooks
  const { data: queue = [], isLoading: queueLoading } = useGetQueue();
  const addSong = useAddQueueSong();
  const removeSong = useRemoveQueueSong();
  const reorderQueue = useReorderQueue();

  // Local UI state
  const [addingId, setAddingId] = useState<string | null>(null);
  const [volume, setVolume] = useState(100);

  // Derived state
  const currentSongIndex = useMemo(() => {
    if (!playbackState.queueSongId) return -1;
    return queue.findIndex(s => s.id === playbackState.queueSongId);
  }, [queue, playbackState.queueSongId]);
  
  const currentSong = currentSongIndex >= 0 ? queue[currentSongIndex] : null;

  // Background color extraction logic (simplified placeholder, real one would use canvas on thumbnail)
  const bgStyle = useMemo(() => {
    if (!currentSong) return { backgroundColor: 'var(--background)' };
    // We could extract dominant color, but for now we'll use a soft tinted overlay
    // to give that cinematic "reacting to artwork" feel without heavy client processing
    return {
      backgroundImage: `radial-gradient(circle at 50% 30%, rgba(255,255,255,0.05) 0%, transparent 60%), url(${currentSong.thumbnail})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }, [currentSong]);

  // Player controls
  const handlePlayPause = (play: boolean) => {
    if (!currentSong && play && queue.length > 0) {
      // Start playing first song if nothing is playing
      updatePlayback({ 
        queueSongId: queue[0].id, 
        videoId: queue[0].videoId,
        isPlaying: true,
        positionSeconds: 0
      });
    } else {
      updatePlayback({ isPlaying: play });
    }
  };

  const handleSeek = (seconds: number) => {
    updatePlayback({ positionSeconds: seconds });
    player.seekTo(seconds);
  };

  const safeRemove = (id: number) => {
    removeSong.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
          broadcastQueueChange();
        }
      }
    );
  };

  const handleSkip = () => {
    if (currentSongIndex >= 0 && currentSongIndex < queue.length - 1) {
      const nextSong = queue[currentSongIndex + 1];
      
      // Auto-remove the finished song
      if (currentSong) {
        safeRemove(currentSong.id);
      }

      updatePlayback({
        queueSongId: nextSong.id,
        videoId: nextSong.videoId,
        isPlaying: true,
        positionSeconds: 0
      });
    } else {
      // End of queue
      if (currentSong) safeRemove(currentSong.id);
      updatePlayback({ queueSongId: null, videoId: null, isPlaying: false, positionSeconds: 0 });
    }
  };

  // YouTube Player instance
  const player = useYouTubePlayer({
    videoId: playbackState.videoId,
    isPlaying: playbackState.isPlaying,
    positionSeconds: playbackState.positionSeconds,
    onPositionChange: (time) => {
      // Only emit sync if we're actually playing to avoid drift storms
      if (playbackState.isPlaying) {
        updatePlayback({ positionSeconds: time });
      }
    },
    onStateChange: (state) => {
      if (state === "ENDED") {
        handleSkip();
      } else if (state === "PLAYING" && !playbackState.isPlaying) {
        updatePlayback({ isPlaying: true });
      } else if (state === "PAUSED" && playbackState.isPlaying) {
        updatePlayback({ isPlaying: false });
      }
    },
    onError: (err) => {
      toast({ title: "Playback Error", description: "This video couldn't be played. Skipping.", variant: "destructive" });
      handleSkip();
    },
    onReady: () => {
      player.setVolume(volume);
    }
  });

  // Action handlers
  const handleAdd = (video: any) => {
    setAddingId(video.videoId);
    addSong.mutate(
      { data: video },
      {
        onSuccess: (newSong) => {
          toast({ description: "Added to queue" });
          queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
          broadcastQueueChange();
          
          // Auto-play if nothing is playing
          if (!playbackState.isPlaying && !playbackState.videoId) {
            updatePlayback({
              queueSongId: newSong.id,
              videoId: newSong.videoId,
              isPlaying: true,
              positionSeconds: 0
            });
          }
        },
        onSettled: () => setAddingId(null)
      }
    );
  };

  const handleRemove = (id: number) => {
    // If removing the currently playing song, skip first (which internally
    // calls safeRemove for the current song). Don't double-delete.
    if (id === playbackState.queueSongId) {
      handleSkip();
      return;
    }
    safeRemove(id);
  };

  const handleReorder = (orderedIds: number[]) => {
    // Optimistic UI update
    queryClient.setQueryData(getGetQueueQueryKey(), (old: QueueSong[]) => {
      if (!old) return old;
      const map = new Map(old.map(s => [s.id, s]));
      return orderedIds.map(id => map.get(id)!).filter(Boolean);
    });

    reorderQueue.mutate(
      { data: { orderedIds } },
      {
        onSuccess: () => {
          broadcastQueueChange();
        },
        onError: () => {
          // Revert on error
          queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
          toast({ title: "Failed to reorder", variant: "destructive" });
        }
      }
    );
  };

  const handlePlayFromQueue = (songId: number) => {
    const song = queue.find(s => s.id === songId);
    if (song) {
      updatePlayback({
        queueSongId: song.id,
        videoId: song.videoId,
        isPlaying: true,
        positionSeconds: 0
      });
    }
  };

  const handleLogout = () => {
    clearToken();
    setLocation("/login");
  };

  if (meLoading || !me) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const durationSecs = currentSong ? parseDurationToSeconds(currentSong.duration) : 0;

  return (
    <div className="min-h-[100dvh] w-full bg-background relative overflow-hidden flex flex-col md:flex-row text-foreground">
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 z-0 transition-all duration-1000 ease-in-out opacity-20 blur-3xl scale-110"
        style={bgStyle}
      />
      {/* Gradient overlay to ensure text readability */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-background/90 via-background/80 to-background/95" />

      {/* Hidden YouTube Player */}
      <div className="absolute opacity-0 pointer-events-none w-0 h-0" ref={player.containerRef} />

      {/* Left Column: Player & Controls (Desktop) / Top Section (Mobile) */}
      <div className="relative z-10 flex-1 flex flex-col p-4 md:p-8 lg:p-12 gap-8 justify-between min-h-[60vh] md:min-h-screen">
        
        {/* Header */}
        <header className="flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <h1 className="font-display tracking-widest text-xl text-white/90 uppercase">OurRoom</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleLogout} className="text-white/30 hover:text-white/80 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Currently Playing Art */}
        <div className="flex-1 flex items-center justify-center w-full max-w-2xl mx-auto">
          {currentSong ? (
            <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] group animate-in zoom-in-95 duration-500">
              <img 
                src={currentSong.thumbnail} 
                alt="Artwork" 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
                <h2 className="text-2xl md:text-4xl font-display font-medium text-white mb-2 leading-tight drop-shadow-lg">
                  {currentSong.title}
                </h2>
                <p className="text-white/70 font-mono text-sm tracking-wider uppercase">
                  {currentSong.channel}
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full aspect-video rounded-3xl glass-card flex flex-col items-center justify-center text-white/20 border-dashed border-white/10">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <div className="w-2 h-2 rounded-full bg-white/20" />
              </div>
              <p className="font-light tracking-wide">Select a song to start listening</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <PlayerControls 
          isPlaying={playbackState.isPlaying}
          onPlayPause={handlePlayPause}
          positionSeconds={playbackState.positionSeconds}
          durationSeconds={durationSecs}
          onSeek={handleSeek}
          onSkip={handleSkip}
          volume={volume}
          onVolumeChange={(v) => { setVolume(v); player.setVolume(v); }}
        />

      </div>

      {/* Right Column: Search & Queue (Desktop) / Bottom Section (Mobile) */}
      <div className="relative z-10 w-full md:w-[400px] lg:w-[480px] shrink-0 bg-black/40 backdrop-blur-3xl border-t md:border-t-0 md:border-l border-white/10 p-4 flex flex-col gap-4 h-[50vh] md:h-[100dvh]">
        <SearchPanel onAdd={handleAdd} isAdding={addSong.isPending} addingId={addingId} />
        <QueuePanel 
          queue={queue} 
          currentSongId={playbackState.queueSongId} 
          onRemove={handleRemove}
          onReorder={handleReorder}
          onPlay={handlePlayFromQueue}
        />
      </div>

    </div>
  );
}
