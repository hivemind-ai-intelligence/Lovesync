import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { QueueSong } from "@workspace/api-client-react";
import { GripVertical, X, Music2, Trash2, Play, ChevronDown, ChevronUp } from "lucide-react";
import { formatDuration } from "@/lib/youtube";

interface QueuePanelProps {
  queue: QueueSong[];
  currentSongId: number | null;
  onRemove: (id: number) => void;
  onReorder: (orderedIds: number[]) => void;
  onPlay: (songId: number) => void;
  onClear: () => void;
}

export function QueuePanel({
  queue,
  currentSongId,
  onRemove,
  onReorder,
  onPlay,
  onClear,
}: QueuePanelProps) {
  const [showHistory, setShowHistory] = useState(false);

  const currentIndex = currentSongId !== null
    ? queue.findIndex((s) => s.id === currentSongId)
    : -1;

  const prevSongs = currentIndex > 0 ? queue.slice(0, currentIndex) : [];
  const currentSong = currentIndex >= 0 ? queue[currentIndex] : null;

  // Derive the up-next list from props — single source of truth
  const upNextFromProps = currentIndex >= 0 ? queue.slice(currentIndex + 1) : queue;

  // Local ordered state for the up-next section (used during drag)
  const [localUpNext, setLocalUpNext] = useState<QueueSong[]>(upNextFromProps);
  const isDraggingRef = useRef(false);

  // Sync from props whenever an external change occurs (not from an active drag)
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalUpNext(upNextFromProps);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, currentSongId]);

  const handleReorderEnd = () => {
    isDraggingRef.current = false;
    // Reconstruct full queue: previously played + current + new up-next order
    const newOrder = [
      ...prevSongs,
      ...(currentSong ? [currentSong] : []),
      ...localUpNext,
    ];
    onReorder(newOrder.map((s) => s.id));
  };

  const totalCount = queue.length;

  if (queue.length === 0) {
    return (
      <div className="glass-panel flex-1 rounded-2xl flex flex-col items-center justify-center p-6 text-center border-dashed border-white/8 min-h-[140px]">
        <Music2 className="w-8 h-8 text-white/10 mb-3" />
        <p className="text-sm text-white/30 font-light">Queue is empty</p>
        <p className="text-xs text-white/15 mt-1">Search above to add songs</p>
      </div>
    );
  }

  return (
    <div className="glass-panel flex-1 rounded-2xl overflow-hidden flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0 bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <h3 className="text-xs font-medium tracking-widest uppercase text-white/50">Queue</h3>
          <span className="bg-white/10 text-white/40 text-[10px] font-mono px-1.5 py-0.5 rounded-full">
            {totalCount}
          </span>
        </div>
        {totalCount > 0 && (
          <motion.button
            onClick={onClear}
            className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-destructive/80 transition-colors"
            whileTap={{ scale: 0.9 }}
            title="Clear queue"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear all</span>
          </motion.button>
        )}
      </div>

      <div className="overflow-y-auto flex-1 custom-scrollbar">
        {/* Previously Played */}
        {prevSongs.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="w-full flex items-center gap-2 px-4 py-2 text-[11px] text-white/25 hover:text-white/45 transition-colors"
            >
              {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span className="uppercase tracking-widest">Previously played ({prevSongs.length})</span>
            </button>
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {prevSongs.map((song) => (
                    <QueueItem
                      key={song.id}
                      song={song}
                      isCurrent={false}
                      isHistory={true}
                      onRemove={onRemove}
                      onPlay={onPlay}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Now Playing */}
        {currentSong && (
          <div>
            <div className="px-4 py-1.5 text-[11px] uppercase tracking-widest text-primary/60 font-medium">
              Now Playing
            </div>
            <QueueItem
              song={currentSong}
              isCurrent={true}
              isHistory={false}
              onRemove={onRemove}
              onPlay={onPlay}
            />
          </div>
        )}

        {/* Up Next — reorderable, single source of truth = localUpNext */}
        {localUpNext.length > 0 && (
          <div>
            <div className="px-4 py-1.5 text-[11px] uppercase tracking-widest text-white/25 font-medium">
              Up Next
            </div>
            <Reorder.Group
              axis="y"
              values={localUpNext}
              onReorder={(newOrder) => {
                isDraggingRef.current = true;
                setLocalUpNext(newOrder);
              }}
              className="px-1.5 space-y-0.5"
              onPointerUp={handleReorderEnd}
            >
              {localUpNext.map((song) => (
                <Reorder.Item
                  key={song.id}
                  value={song}
                  className="list-none"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
                >
                  <QueueItem
                    song={song}
                    isCurrent={false}
                    isHistory={false}
                    onRemove={onRemove}
                    onPlay={onPlay}
                    draggable
                  />
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
        )}
      </div>
    </div>
  );
}

interface QueueItemProps {
  song: QueueSong;
  isCurrent: boolean;
  isHistory: boolean;
  onRemove: (id: number) => void;
  onPlay: (id: number) => void;
  draggable?: boolean;
}

function QueueItem({ song, isCurrent, isHistory, onRemove, onPlay, draggable }: QueueItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      layout
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors relative group
        ${isCurrent
          ? "bg-primary/10 border border-primary/15"
          : "hover:bg-white/[0.04] border border-transparent"
        }
        ${isHistory ? "opacity-40" : "opacity-100"}
      `}
    >
      {/* Drag handle (only for up-next items) */}
      {draggable ? (
        <div className="cursor-grab active:cursor-grabbing text-white/15 group-hover:text-white/40 shrink-0 touch-none select-none">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      ) : (
        <div className="w-3.5 shrink-0" />
      )}

      {/* Thumbnail */}
      <div
        className={`relative w-[42px] h-[28px] rounded overflow-hidden shrink-0 bg-black/40 ${
          isCurrent ? "ring-1 ring-primary/40" : ""
        }`}
      >
        <img
          src={song.thumbnail}
          alt={song.title}
          className={`w-full h-full object-cover transition-opacity ${
            isCurrent ? "opacity-100" : "opacity-60 group-hover:opacity-85"
          }`}
          loading="lazy"
        />
        {isCurrent && (
          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
            <div className="flex gap-[2px] items-end h-2.5">
              {[0, 200, 400].map((delay) => (
                <motion.div
                  key={delay}
                  className="w-[2px] bg-primary rounded-full"
                  animate={{ height: ["60%", "100%", "60%"] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: delay / 1000, ease: "easeInOut" }}
                  style={{ height: "60%" }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate transition-colors leading-snug ${
          isCurrent ? "text-primary/90" : "text-white/70 group-hover:text-white/90"
        }`}>
          {song.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-white/25 font-light">
          <span className="truncate max-w-[90px]">{song.channel}</span>
          {song.duration && (
            <>
              <span>·</span>
              <span className="shrink-0">{formatDuration(song.duration)}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions (on hover) */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-0.5 shrink-0"
          >
            {!isCurrent && (
              <motion.button
                onClick={() => onPlay(song.id)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-primary/20 transition-colors"
                whileTap={{ scale: 0.85 }}
                title="Play now"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </motion.button>
            )}
            <motion.button
              onClick={() => onRemove(song.id)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-white/30 hover:text-destructive/80 hover:bg-destructive/10 transition-colors"
              whileTap={{ scale: 0.85 }}
              title="Remove"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
