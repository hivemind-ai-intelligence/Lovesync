---
name: OURROOM socket presence tracking
description: Multi-tab socket presence must use Map<username, Set<socketId>> not Set<username>.
---

**Rule:** Track connected users as `Map<string, Set<string>>` (username → socketIds) in `artifacts/api-server/src/socket.ts`.

**Why:** If one user has two browser tabs open and closes one, a naive `Set<username>` delete would emit `users:update` showing the user as disconnected even though they still have an active socket. This causes the "Together ♥" indicator to flicker incorrectly.

**How to apply:**
- On connect: `userSocketMap.get(username) ?? new Set()`, add `socket.id`, set back.
- On disconnect: get the set, delete `socket.id`, if set is now empty delete the key.
- Broadcast: `Array.from(userSocketMap.keys())`.
