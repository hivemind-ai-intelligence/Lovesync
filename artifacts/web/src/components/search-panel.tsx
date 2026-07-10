import { useState, useEffect, useRef } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { useSearchYoutube, YoutubeResult } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { formatDuration } from "@/lib/youtube";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchPanelProps {
  onAdd: (song: YoutubeResult) => void;
  isAdding: boolean;
  addingId: string | null;
}

export function SearchPanel({ onAdd, isAdding, addingId }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);
  const [isFocused, setIsFocused] = useState(false);
  
  const searchResults = useSearchYoutube(
    { q: debouncedQuery },
    { 
      query: { 
        enabled: debouncedQuery.length > 2,
        queryKey: ["search", debouncedQuery] as any
      } 
    }
  );

  return (
    <div className={`glass-panel rounded-2xl overflow-hidden transition-all duration-500 ${isFocused || query ? "flex-1 min-h-[50vh]" : "h-16"}`}>
      <div className="relative p-2 flex items-center border-b border-white/5">
        <Search className="w-5 h-5 text-muted-foreground absolute left-6" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Search YouTube..."
          className="w-full bg-transparent border-none text-white pl-12 h-12 focus-visible:ring-0 text-lg font-light placeholder:text-muted-foreground/50"
          spellCheck={false}
        />
      </div>

      {(debouncedQuery.length > 2) && (
        <div className="overflow-y-auto h-[calc(100%-4rem)] p-2 space-y-1 custom-scrollbar">
          {searchResults.isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
            </div>
          ) : searchResults.data?.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground font-light">
              No results found.
            </div>
          ) : (
            searchResults.data?.map((video, idx) => (
              <div 
                key={video.videoId}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "both" }}
              >
                <div className="relative w-24 h-16 rounded-md overflow-hidden shrink-0 bg-black/40">
                  <img 
                    src={video.thumbnail} 
                    alt={video.title} 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    loading="lazy"
                  />
                  <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider">
                    {formatDuration(video.duration)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white truncate group-hover:text-primary-foreground transition-colors">
                    {video.title}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {video.channel}
                  </p>
                </div>

                <button
                  onClick={() => onAdd(video)}
                  disabled={isAdding && addingId === video.videoId}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-primary/20 hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isAdding && addingId === video.videoId ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
