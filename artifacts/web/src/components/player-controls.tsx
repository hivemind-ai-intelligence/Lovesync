import { useState, useEffect, useRef } from "react";
import { Play, Pause, SkipForward, Volume2, VolumeX } from "lucide-react";
import { formatTime } from "@/lib/youtube";

interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: (play: boolean) => void;
  positionSeconds: number;
  durationSeconds: number;
  onSeek: (seconds: number) => void;
  onSkip: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export function PlayerControls({
  isPlaying,
  onPlayPause,
  positionSeconds,
  durationSeconds,
  onSeek,
  onSkip,
  volume,
  onVolumeChange,
}: PlayerControlsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  const progress = isDragging ? dragProgress : (durationSeconds ? (positionSeconds / durationSeconds) * 100 : 0);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!progressBarRef.current || !durationSeconds) return;
    setIsDragging(true);
    updateProgress(e.clientX);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateProgress(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || !durationSeconds) return;
    setIsDragging(false);
    onSeek((dragProgress / 100) * durationSeconds);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const updateProgress = (clientX: number) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setDragProgress(percentage);
  };

  const toggleMute = () => {
    onVolumeChange(volume === 0 ? 100 : 0);
  };

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col gap-6 w-full max-w-3xl mx-auto shadow-2xl relative z-10 overflow-hidden group">
      {/* Dynamic glow effect behind controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Progress Bar */}
      <div className="flex flex-col gap-2">
        <div 
          ref={progressBarRef}
          className="h-2 w-full bg-white/10 rounded-full cursor-pointer relative touch-none overflow-hidden"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Buffered track could go here */}
          <div 
            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-primary/80 to-primary rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground font-mono tracking-widest opacity-70">
          <span>{formatTime(isDragging ? (dragProgress/100)*durationSeconds : positionSeconds)}</span>
          <span>{formatTime(durationSeconds)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Volume */}
        <div className="flex items-center gap-3 w-1/4">
          <button 
            onClick={toggleMute}
            className="text-white/60 hover:text-white transition-colors"
          >
            {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={volume} 
            onChange={(e) => onVolumeChange(parseInt(e.target.value))}
            className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          />
        </div>

        {/* Playback */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => onPlayPause(!isPlaying)}
            className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-1" />
            )}
          </button>
          
          <button 
            onClick={onSkip}
            className="text-white/60 hover:text-white transition-colors hover:scale-110 active:scale-95"
            title="Skip to next"
          >
            <SkipForward className="w-7 h-7" />
          </button>
        </div>

        {/* Empty space for balance */}
        <div className="w-1/4"></div>
      </div>
    </div>
  );
}
