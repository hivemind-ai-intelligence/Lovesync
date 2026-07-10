# OURROOM

A private listening room exclusively for Vasudev and Sana. Search YouTube together, add songs, and hear every play/pause/seek in perfect real-time sync — with a beautifully animated disc-player interface.

## Run & Operate

Two workflows must be running:

- **`API Server`** — `PORT=8080 pnpm --filter @workspace/api-server run dev` (Express + Socket.IO, port 8080, mounted at `/api`)
- **`Web`** — `PORT=22333 BASE_PATH=/ pnpm --filter @workspace/web run dev` (React + Vite, port 22333, mounted at `/`)

Other useful commands:
- `pnpm run typecheck` — typecheck all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Required Environment Secrets

| Secret | Purpose |
|--------|---------|
| `SESSION_SECRET` | JWT signing (already set) |
| `OURROOM_USERNAME` | Login username |
| `OURROOM_PASSWORD` | Login password |
| `YOUTUBE_API_KEY` | YouTube Data API v3 (server-side only, never reaches client) |
| `DATABASE_URL` | PostgreSQL connection (Drizzle ORM) |

## Stack

- **Runtime**: Node.js 20, TypeScript, pnpm workspaces
- **Frontend**: React 19, Vite 7, TanStack Query, wouter, Framer Motion, Tailwind CSS 4, shadcn/ui, socket.io-client
- **Backend**: Express 5, Socket.IO
- **Database**: PostgreSQL + Drizzle ORM (queue persisted; playback state is in-memory only)
- **API codegen**: Orval (from `lib/api-spec/openapi.yaml`)

## Architecture

- **Queue** (`lib/db/src/schema/queue.ts`): Persistent. Songs stay in the queue until manually removed or cleared. `currentSongId` in socket state is a pointer — there's no auto-remove on skip. "Previously Played" = queue songs before the current index; "Up Next" = songs after.
- **Playback state** (`artifacts/api-server/src/socket.ts`): In-memory, synced via Socket.IO. Fields: `queueSongId`, `videoId`, `isPlaying`, `positionSeconds`, `shuffle`, `repeat` (`off`|`one`|`all`).
- **Presence** (`artifacts/api-server/src/socket.ts`): Tracked via `Map<username, Set<socketId>>` so multi-tab disconnect doesn't falsely remove a user.
- **YouTube thumbnails**: Frontend upgrades thumbnail URLs to `maxresdefault.jpg` with fallback to the API-returned URL.
- **Dynamic background**: Per-song hue derived from a deterministic hash of `videoId` (no canvas/CORS required). Blurred thumbnail backdrop layered on top.

## Where Things Live

| What | Where |
|------|-------|
| API contract | `lib/api-spec/openapi.yaml` |
| DB schema | `lib/db/src/schema/queue.ts` |
| Backend routes | `artifacts/api-server/src/routes/` |
| Socket sync | `artifacts/api-server/src/socket.ts` (server) · `artifacts/web/src/lib/socket.ts` + `playback-context.tsx` (client) |
| YouTube player | `artifacts/web/src/lib/use-youtube-player.ts` |
| Main page | `artifacts/web/src/pages/music-room.tsx` |
| Components | `artifacts/web/src/components/` — `player-controls.tsx`, `search-panel.tsx`, `queue-panel.tsx` |
| Global styles | `artifacts/web/src/index.css` |

## User Preferences

- This room is ONLY for Vasudev and Sana — private, no public access.
- Premium aesthetic: Apple Music / Spotify quality feel with glassmorphism, aurora backgrounds, disc artwork rotation, Framer Motion animations.
- Songs are NOT auto-removed from queue on skip. The queue pointer moves; songs persist until manually cleared.

## Gotchas

- `pnpm run typecheck` shows TS6305 errors for lib packages (no build step, they export from `.ts` source directly). Vite handles them at runtime — these do not affect the running app.
- The `onReady` callback in `use-youtube-player.ts` captures `player` via closure — this is safe because `onReady` is always called asynchronously after the component has rendered.
- Volume `handleVolumeChange` in `music-room.tsx` is intentionally NOT memoized — it must always call the current `player.setVolume` to avoid stale closures.
