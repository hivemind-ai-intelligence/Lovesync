import { useState, useRef } from "react";
import { QueueSong } from "@workspace/api-client-react";
import { GripVertical, X, Music2 } from "lucide-react";
import { formatTime, formatDuration } from "@/lib/youtube";

interface QueuePanelProps {
  queue: QueueSong[];
  currentSongId: number | null;
  onRemove: (id: number) => void;
  onReorder: (orderedIds: number[]) => void;
  onPlay: (songId: number) => void;
}

export function QueuePanel({ queue, currentSongId, onRemove, onReorder, onPlay }: QueuePanelProps) {
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    // Slightly transparent ghost image
    const crt = e.currentTarget.cloneNode(true) as HTMLElement;
    crt.style.opacity = "0.5";
    document.body.appendChild(crt);
    e.dataTransfer.setDragImage(crt, 20, 20);
    setTimeout(() => document.body.removeChild(crt), 0);
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const newQueue = [...queue];
    const draggedIdx = newQueue.findIndex(s => s.id === draggedId);
    const targetIdx = newQueue.findIndex(s => s.id === targetId);

    const [draggedItem] = newQueue.splice(draggedIdx, 1);
    newQueue.splice(targetIdx, 0, draggedItem);

    onReorder(newQueue.map(s => s.id));
    setDraggedId(null);
    setDragOverId(null);
  };

  if (queue.length === 0) {
    return (
      <div className="glass-panel flex-1 rounded-2xl flex flex-col items-center justify-center p-8 text-center border-dashed border-white/10">
        <Music2 className="w-12 h-12 text-white/10 mb-4" />
        <h3 className="text-lg font-medium text-white/40">Queue is empty</h3>
        <p className="text-sm text-white/20 mt-2 font-light">Search to add songs</p>
      </div>
    );
  }

  return (
    <div className="glass-panel flex-1 rounded-2xl overflow-hidden flex flex-col">
      <div className="p-4 border-b border-white/5 bg-white/[0.02]">
        <h3 className="text-sm font-display font-medium tracking-widest uppercase text-muted-foreground">Up Next</h3>
      </div>
      
      <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
        {queue.map((song, idx) => {
          const isCurrent = song.id === currentSongId;
          const isDragging = song.id === draggedId;
          const isDragOver = song.id === dragOverId;
          
          // Parse duration string to seconds roughly for display if needed, but we already have formatDuration
          
          return (
            <div
              key={song.id}
              draggable
              onDragStart={(e) => handleDragStart(e, song.id)}
              onDragOver={(e) => handleDragOver(e, song.id)}
              onDragLeave={() => setDragOverId(null)}
              onDrop={(e) => handleDrop(e, song.id)}
              onDoubleClick={() => onPlay(song.id)}
              className={`
                flex items-center gap-3 p-3 rounded-xl transition-all group relative
                ${isCurrent ? "bg-primary/10 border border-primary/20" : "hover:bg-white/5 border border-transparent"}
                ${isDragging ? "opacity-30" : "opacity-100"}
                ${isDragOver ? "border-t-primary shadow-[0_-2px_10px_rgba(255,0,128,0.3)]" : ""}
              `}
            >
              {/* Drag handle */}
              <div className="cursor-grab active:cursor-grabbing text-white/20 group-hover:text-white/50 px-1">
                <GripVertical className="w-4 h-4" />
              </div>

              {/* Thumbnail */}
              <div className={`relative w-16 h-10 rounded shrink-0 overflow-hidden bg-black/40 ${isCurrent ? 'ring-1 ring-primary/50' : ''}`}>
                <img 
                  src={song.thumbnail} 
                  alt={song.title} 
                  className={`w-full h-full object-cover transition-opacity ${isCurrent ? 'opacity-100' : 'opacity-70 group-hover:opacity-90'}`}
                />
                {isCurrent && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px]">
                    <div className="flex gap-[2px] items-center h-3">
                      <div className="w-[2px] h-full bg-primary animate-[bounce_1s_infinite] origin-bottom" style={{ animationDelay: '0ms' }} />
                      <div className="w-[2px] h-2/3 bg-primary animate-[bounce_1s_infinite] origin-bottom" style={{ animationDelay: '200ms' }} />
                      <div className="w-[2px] h-full bg-primary animate-[bounce_1s_infinite] origin-bottom" style={{ animationDelay: '400ms' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className={`text-sm truncate font-medium transition-colors ${isCurrent ? "text-primary-foreground shadow-primary" : "text-white/80 group-hover:text-white"}`}>
                  {song.title}
                </h4>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                  <span className="truncate max-w-[120px]">{song.channel}</span>
                  <span className="opacity-50">•</span>
                  <span>{formatDuration(song.duration)}</span>
                  <span className="opacity-50">•</span>
                  <span className="truncate max-w-[60px] text-white/30">{song.addedBy}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 px-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(song.id); }}
                  className="p-2 hover:bg-destructive/20 text-white/50 hover:text-destructive rounded-full transition-colors"
                  title="Remove from queue"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
