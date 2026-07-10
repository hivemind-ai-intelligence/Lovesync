# OURROOM

A private mobile app ("a place only for us") with a login screen, chat, and playlist features for a small, fixed set of users.

## Run & Operate

Three artifacts, each with its own managed workflow (already running):

- `artifacts/api-server: API Server` — `pnpm --filter @workspace/api-server run dev` (Express API, port 8080, mounted at `/api`)
- `artifacts/mobile: expo` — `pnpm --filter @workspace/mobile run dev` (Expo app, mounted at `/`)
- `artifacts/mockup-sandbox: Component Preview Server` — canvas/design preview, not part of the shipped app

Other useful commands:
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` (Postgres, pre-provisioned) and `SESSION_SECRET` (JWT signing, already set)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo / React Native
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `pnpm run typecheck` fails on `artifacts/mockup-sandbox` (pre-existing `@types/react` version-duplication error in generated shadcn `calendar.tsx`/`spinner.tsx`). Does not affect the running app or the other two artifacts; needs a dependency dedupe to fix.
- Login credentials fall back to hardcoded defaults if `OURROOM_USERNAME`/`OURROOM_PASSWORD` aren't set — fine for the current private 2-person use, but should move to required secrets before wider use.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
