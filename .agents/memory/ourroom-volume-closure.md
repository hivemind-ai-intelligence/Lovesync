---
name: OURROOM volume closure pitfall
description: handleVolumeChange must NOT use useCallback with empty deps — needs fresh player.setVolume each render.
---

**Rule:** In `artifacts/web/src/pages/music-room.tsx`, `handleVolumeChange` must be an inline (non-memoized) function.

**Why:** `useYouTubePlayer` returns a new `player` object each render whose `setVolume` function is re-memoized with `useCallback([isPlayerReady])`. Wrapping `handleVolumeChange` in `useCallback([])` captures the initial (pre-ready) `player.setVolume` — a no-op. The slider UI updates correctly but the actual YouTube player volume never changes.

**How to apply:** Write it as a plain function, not `useCallback`:
```tsx
const handleVolumeChange = (v: number) => {
  setVolume(v);
  localStorage.setItem("ourroom_volume", String(v));
  player.setVolume(v); // always fresh player reference
};
```
