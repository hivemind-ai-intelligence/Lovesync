import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipForward, SkipBack,
  Volume2, Volume1, VolumeX,
  Shuffle, Repeat, Repeat1,
} from "lucide-react";
import { formatTime } from "@/lib/youtube";
import type { RepeatMode } from "@/lib/playback-context";

interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: (play: boolean) => void;
  positionSeconds: number;
  durationSeconds: number;
  onSeek: (seconds: number) => void;
  onSkip: () => void;
  onPrev: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  shuffle: boolean;
  onToggleShuffle: () => void;
  repeat: RepeatMode;
  onCycleRepeat: () => void;
  hasSong: boolean;
}

export function PlayerControls({
  isPlaying,
  onPlayPause,
  positionSeconds,
  durationSeconds,
  onSeek,
  onSkip,
  onPrev,
  volume,
  onVolumeChange,
  shuffle,
  onToggleShuffle,
  repeat,
  onCycleRepeat,
  hasSong,
}: PlayerControlsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [prevVolume, setPrevVolume] = useState(80);
  const [showVolumeTooltip, setShowVolumeTooltip] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const progress = isDragging
    ? dragProgress
    : durationSeconds > 0
    ? Math.min(100, (positionSeconds / durationSeconds) * 100)
    : 0;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (!hasSong) return;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          onPlayPause(!isPlaying);
          break;
        case "ArrowRight":
          e.preventDefault();
          onSeek(Math.min(positionSeconds + 10, durationSeconds));
          break;
        case "ArrowLeft":
          e.preventDefault();
          onSeek(Math.max(positionSeconds - 10, 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          onVolumeChange(Math.min(volume + 10, 100));
          break;
        case "ArrowDown":
          e.preventDefault();
          onVolumeChange(Math.max(volume - 10, 0));
          break;
        case "KeyM":
          e.preventDefault();
          if (volume > 0) { setPrevVolume(volume); onVolumeChange(0); }
          else onVolumeChange(prevVolume);
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [hasSong, isPlaying, positionSeconds, durationSeconds, volume, prevVolume, onPlayPause, onSeek, onVolumeChange]);

  const getPositionFromEvent = useCallback((clientX: number) => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (x / rect.width) * 100;
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!durationSeconds) return;
    setIsDragging(true);
    const pct = getPositionFromEvent(e.clientX);
    setDragProgress(pct);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragProgress(getPositionFromEvent(e.clientX));
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || !durationSeconds) return;
    setIsDragging(false);
    onSeek((dragProgress / 100) * durationSeconds);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const toggleMute = () => {
    if (volume > 0) { setPrevVolume(volume); onVolumeChange(0); }
    else onVolumeChange(prevVolume || 80);
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;

  const controlClass = (active: boolean) =>
    `relative w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 active:scale-90 disabled:opacity-30 ${
      active
        ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]"
        : "text-white/50 hover:text-white hover:bg-white/8"
    }`;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 relative z-10">
      {/* Progress bar */}
      <div className="flex flex-col gap-1.5">
        <div
          ref={progressBarRef}
          className="h-1.5 w-full bg-white/10 rounded-full cursor-pointer relative touch-none group/bar"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Fill */}
          <motion.div
            className="absolute top-0 left-0 bottom-0 rounded-full bg-gradient-to-r from-primary/80 via-primary to-primary/90 pointer-events-none"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            transition={{ duration: isDragging ? 0 : 0.1 }}
          />
          {/* Thumb */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md shadow-black/40 pointer-events-none opacity-0 group-hover/bar:opacity-100 transition-opacity"
            style={{ left: `calc(${Math.min(100, Math.max(0, progress))}% - 7px)` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-white/35 font-mono tracking-wider select-none">
          <span>{formatTime(isDragging ? (dragProgress / 100) * durationSeconds : positionSeconds)}</span>
          <span>{durationSeconds > 0 ? formatTime(durationSeconds) : "--:--"}</span>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between px-2">
        {/* Left: Shuffle */}
        <div className="flex items-center gap-1 w-1/4">
          <motion.button
            onClick={onToggleShuffle}
            className={controlClass(shuffle)}
            whileTap={{ scale: 0.88 }}
            disabled={!hasSong}
            title="Shuffle (S)"
          >
            <Shuffle className="w-4 h-4" />
            {shuffle && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
            )}
          </motion.button>
        </div>

        {/* Center: Prev / Play / Next */}
        <div className="flex items-center gap-3">
          {/* Prev */}
          <motion.button
            onClick={onPrev}
            disabled={!hasSong}
            className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/8 disabled:opacity-30 active:scale-90"
            whileTap={{ scale: 0.88 }}
            title="Previous"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </motion.button>

          {/* Play / Pause */}
          <motion.button
            onClick={() => onPlayPause(!isPlaying)}
            disabled={!hasSong}
            className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_24px_rgba(255,255,255,0.25)] hover:shadow-[0_0_32px_rgba(255,255,255,0.4)] transition-shadow disabled:opacity-40"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.93 }}
            title="Play/Pause (Space)"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isPlaying ? "pause" : "play"}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                {isPlaying
                  ? <Pause className="w-6 h-6 fill-current" />
                  : <Play className="w-6 h-6 fill-current ml-0.5" />
                }
              </motion.div>
            </AnimatePresence>
          </motion.button>

          {/* Next */}
          <motion.button
            onClick={onSkip}
            disabled={!hasSong}
            className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/8 disabled:opacity-30 active:scale-90"
            whileTap={{ scale: 0.88 }}
            title="Next"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </motion.button>
        </div>

        {/* Right: Repeat + Volume */}
        <div className="flex items-center gap-1 w-1/4 justify-end">
          {/* Repeat */}
          <motion.button
            onClick={onCycleRepeat}
            className={controlClass(repeat !== "off")}
            whileTap={{ scale: 0.88 }}
            disabled={!hasSong}
            title={`Repeat: ${repeat}`}
          >
            <RepeatIcon className="w-4 h-4" />
            {repeat !== "off" && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Volume row */}
      <div
        className="flex items-center gap-3 px-4 pb-1"
        onMouseEnter={() => setShowVolumeTooltip(true)}
        onMouseLeave={() => setShowVolumeTooltip(false)}
      >
        <motion.button
          onClick={toggleMute}
          className="text-white/40 hover:text-white transition-colors shrink-0"
          whileTap={{ scale: 0.88 }}
          title="Mute (M)"
        >
          <VolumeIcon className="w-4 h-4" />
        </motion.button>

        {/* Custom volume slider */}
        <div className="relative flex-1 h-4 flex items-center group/vol">
          <div className="w-full h-1 bg-white/10 rounded-full relative cursor-pointer">
            <div
              className="h-full bg-white/40 rounded-full transition-all"
              style={{ width: `${volume}%` }}
            />
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
            title={`Volume: ${volume}%`}
          />
          <AnimatePresence>
            {showVolumeTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/80 text-white/80 text-[10px] font-mono px-2 py-0.5 rounded pointer-events-none"
              >
                {volume}%
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
