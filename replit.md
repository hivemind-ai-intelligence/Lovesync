# OURROOM

A private web app ("a place only for us") for two people to search YouTube together and listen in perfect real-time sync, with a shared drag-to-reorder queue.

## Run & Operate

Three artifacts, each with its own managed workflow (already running):

- `artifacts/api-server: API Server` — `pnpm --filter @workspace/api-server run dev` (Express API + Socket.IO, port 8080, mounted at `/api`)
- `artifacts/web: web` — `pnpm --filter @workspace/web run dev` (React + Vite frontend, mounted at `/`)
- `artifacts/mockup-sandbox: Component Preview Server` — canvas/design preview, not part of the shipped app

Other useful commands:
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` (Postgres, pre-provisioned), `SESSION_SECRET` (JWT signing), `YOUTUBE_API_KEY` (YouTube Data API v3, server-side only), `OURROOM_USERNAME`/`OURROOM_PASSWORD`/`OURROOM_USERNAME_2`/`OURROOM_PASSWORD_2` (the two accounts)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TanStack Query, wouter, Framer Motion, shadcn/ui, socket.io-client
- API: Express 5 + Socket.IO
- DB: PostgreSQL + Drizzle ORM (shared queue is persisted; live playback position/play-state is in-memory only on the api-server, not persisted)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- API contract: `lib/api-spec/openapi.yaml` (auth, YouTube search proxy, queue CRUD/reorder)
- DB schema: `lib/db/src/schema/queue.ts` (shared queue songs table)
- Backend routes: `artifacts/api-server/src/routes/` (`auth.ts`, `youtube.ts`, `queue.ts`)
- Real-time sync: `artifacts/api-server/src/socket.ts` (server), `artifacts/web/src/lib/socket.ts` + `playback-context.tsx` (client)
- YouTube IFrame Player integration: `artifacts/web/src/lib/use-youtube-player.ts`, `artifacts/web/src/lib/youtube.ts`

## Architecture decisions

- The mobile (Expo/React Native) app was fully removed; OURROOM is now a single web app so the browser-only YouTube IFrame Player API can be used directly.
- Live playback state (current song, play/pause, position) is synced over Socket.IO and kept in memory on the API server only — it's ephemeral by design, unlike the queue which is DB-backed for persistence across reloads.
- The YouTube Data API key never reaches the client; all search requests are proxied through `/api/youtube/search`.

## Product

- Private login for exactly two accounts (no signup).
- Search YouTube, add results to a shared queue.
- Real-time synchronized playback between both users via Socket.IO (play/pause/seek/song-change mirror instantly on both screens).
- Drag-to-reorder queue, auto-advance to the next song when one ends.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `pnpm run typecheck` fails on pre-existing shadcn scaffold files (`button-group.tsx`, `calendar.tsx` in both `artifacts/web` and `artifacts/mockup-sandbox`) due to a `@types/react` version-duplication issue. Not caused by app code; doesn't affect the running app.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
