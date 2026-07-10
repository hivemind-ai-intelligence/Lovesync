---
name: OURROOM queue model
description: Songs never auto-removed on skip; currentSongId is a pointer into the persistent queue array.
---

The queue is NOT a "consume on play" model. Songs stay in the database until manually removed or cleared.

**Rule:** `currentSongId` is just a pointer. Skipping moves the pointer forward. No DB delete happens on skip.

**Why:** This enables the "Previously Played / Now Playing / Up Next" queue view — songs above `currentIndex` in the ordered queue are history, the current index is now-playing, songs below are up-next. Auto-deleting on skip would destroy this.

**How to apply:** Any skip/prev/autoadvance logic in `music-room.tsx` must only call `updatePlayback({ queueSongId, videoId, ... })` — never call `safeRemove()` on the current song as a side-effect of navigation. Only call `safeRemove()` when the user explicitly removes a song or clears the queue.
