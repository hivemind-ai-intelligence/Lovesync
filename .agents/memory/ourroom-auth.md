---
name: OURROOM auth architecture
description: JWT auth via SESSION_SECRET; single shared account stored as OURROOM_USERNAME/OURROOM_PASSWORD secrets; token in localStorage; all protected routes/socket require Bearer header.
---

## Auth model

- Single shared login for both users — no per-user accounts, no username attribution anywhere in the UI.
- Credentials stored as secrets: `OURROOM_USERNAME`, `OURROOM_PASSWORD`. Auth route fails closed (500) if either is missing — no hardcoded fallback.
- JWT signed with `SESSION_SECRET`, 30-day expiry.
- Web app: token stored in `localStorage` under key `ourroom_token`. Attached via `setAuthTokenGetter` from `@workspace/api-client-react/src/custom-fetch.ts` so all Orval-generated hooks automatically send `Authorization: Bearer <token>`.
- Socket.IO: token passed in handshake `auth: { token }`, verified server-side before the connection is accepted.

**Why:** Single shared login keeps the app intimate and private — designed exclusively for Vasudev & Sana, with no concept of "who added what." Queue attribution was deliberately removed from schema, API contract, and UI.

**How to apply:** `requireAuth` middleware in `artifacts/api-server/src/middleware/auth.ts` guards all REST routes. Socket auth in `artifacts/api-server/src/socket.ts` uses same JWT verification. On the client, `setAuthTokenGetter` is called once in `artifacts/web/src/lib/auth.ts` on module load.
