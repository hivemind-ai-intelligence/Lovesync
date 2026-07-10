---
name: OURROOM auth architecture
description: How authentication and API security works in the OURROOM mobile app + API server
---

## Rule
All protected API routes (chat, playlist) require a valid `Authorization: Bearer <token>` header. The token is a JWT signed with `SESSION_SECRET`. The mobile app stores the raw JWT in AsyncStorage (key `ourroom_token`) and verifies it against `/api/auth/me` on every app launch.

**Why:** Code review found that the original implementation stored only `{ username }` in AsyncStorage with no server-side validation — any user could forge a session by writing to AsyncStorage. Protected routes were also completely open without auth middleware.

**How to apply:**
- API server: `artifacts/api-server/src/middleware/auth.ts` exports `requireAuth` middleware; apply to any new protected routes via `router.get('/route', requireAuth, handler)`.
- The `req.user.username` set by the middleware is the authoritative identity — never trust username from the request body.
- Mobile: `AuthContext` exposes `token` alongside `username`; pass it to every fetch via `Authorization: Bearer ${token}`. React Query queries should set `enabled: !!token`.
- `SESSION_SECRET` must be set in Replit Secrets; the server fails closed (500) if it is missing.
- User credentials fallback to defaults (`vasudev`/`sana`, both `ourroom2024`) if OURROOM_USERNAME/PASSWORD env vars are not set — acceptable for a private 2-person dev setup but production should use secrets.
