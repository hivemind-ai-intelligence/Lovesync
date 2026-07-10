import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Play, Loader2, X } from "lucide-react";
import { useSearchYoutube, getSearchYoutubeQueryKey, type YoutubeResult } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { formatDuration } from "@/lib/youtube";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchPanelProps {
  onAdd: (song: YoutubeResult) => void;
  onPlayNow: (song: YoutubeResult) => void;
  isAdding: boolean;
  addingId: string | null;
}

/** Return the highest-res thumbnail for a YouTube video. */
function hiResThumbnail(videoId: string, fallback: string): string {
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
}

export function SearchPanel({ onAdd, onPlayNow, isAdding, addingId }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 400);

  const isOpen = isFocused || query.length > 0;

  const { data: results, isLoading, isFetching } = useSearchYoutube(
    { q: debouncedQuery },
    {
      query: {
        queryKey: getSearchYoutubeQueryKey({ q: debouncedQuery }),
        enabled: debouncedQuery.length > 2,
        staleTime: 30_000,
      },
    }
  );

  const clearSearch = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <motion.div
      layout
      className="glass-panel rounded-2xl overflow-hidden flex flex-col"
      animate={{ flexGrow: isOpen ? 1 : 0, minHeight: isOpen ? 180 : 52 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Search bar */}
      <div className="relative flex items-center px-4 h-[52px] shrink-0 border-b border-white/5">
        <motion.div
          animate={{ color: isLoading || isFetching ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
          transition={{ duration: 0.3 }}
        >
          {isLoading || isFetching
            ? <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            : <Search className="w-4 h-4 shrink-0" />
          }
        </motion.div>
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Search YouTube…"
          className="flex-1 bg-transparent border-none text-white pl-3 h-full focus-visible:ring-0 text-sm font-light placeholder:text-white/25"
          spellCheck={false}
          autoComplete="off"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={clearSearch}
              className="text-white/30 hover:text-white/70 transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Results */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="overflow-y-auto flex-1 p-2 space-y-0.5 custom-scrollbar"
          >
            {debouncedQuery.length <= 2 ? (
              <div className="flex items-center justify-center h-16 text-white/20 text-sm font-light">
                Keep typing…
              </div>
            ) : isLoading ? (
              <div className="flex flex-col gap-2 p-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                    <div className="w-20 h-[52px] rounded-lg bg-white/5 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-white/5 rounded w-3/4" />
                      <div className="h-2.5 bg-white/5 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !results || results.length === 0 ? (
              <div className="flex items-center justify-center h-16 text-white/20 text-sm font-light">
                No results for "{debouncedQuery}"
              </div>
            ) : (
              results.map((video, idx) => {
                const isHovered = hoveredId === video.videoId;
                const isAddingThis = isAdding && addingId === video.videoId;
                const thumbnail = hiResThumbnail(video.videoId, video.thumbnail);

                return (
                  <motion.div
                    key={video.videoId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.2 }}
                    onMouseEnter={() => setHoveredId(video.videoId)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group relative cursor-default"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-20 h-[52px] rounded-lg overflow-hidden shrink-0 bg-black/40">
                      <img
                        src={thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = video.thumbnail;
                        }}
                      />
                      {/* Duration badge */}
                      {video.duration && (
                        <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[9px] font-mono tracking-wide text-white/90">
                          {formatDuration(video.duration)}
                        </div>
                      )}
                      {/* Hover overlay: Play Now */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => onPlayNow(video)}
                            disabled={isAddingThis}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]"
                            title="Play now"
                          >
                            <Play className="w-5 h-5 text-white fill-white drop-shadow" />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white/85 truncate group-hover:text-white transition-colors leading-snug">
                        {video.title}
                      </h4>
                      <p className="text-[11px] text-white/35 truncate mt-0.5 font-light">
                        {video.channel}
                      </p>
                    </div>

                    {/* Add to Queue button */}
                    <motion.button
                      onClick={() => onAdd(video)}
                      disabled={isAddingThis}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white/35 hover:text-white hover:bg-primary/20 transition-all shrink-0 disabled:opacity-50"
                      whileTap={{ scale: 0.85 }}
                      title="Add to queue"
                    >
                      {isAddingThis ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </motion.button>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
