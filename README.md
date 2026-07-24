# brandsapp-builder

The **central visual builder/editor** for BrandsApp pages (spec P2). It edits a
tenant's page as data and previews it with the **same `builder-core` engine** the
tenant Workers serve with — so what-you-see equals what-publishes. Opened from a
tenant dashboard; the tenant keeps the renderer + the data.

Stack: **Hono** (Worker API) · **TanStack Router** + **React** + **Vite** (SPA) ·
**Cloudflare Workers** with a **Durable Object** (`DocRoom`) for realtime collab.

> This is a scaffold. The Polaris editor UI (canvas, drag-and-drop, properties
> panel) moves in on top of it; `builder-core` becomes a shared package (spec §11)
> — for now it's aliased to the sibling `brandsapp-multitenant/lib/builder-core`.

## Layout

```
worker/index.ts   Hono app: /api/pages proxy to the tenant + /parties realtime + SPA fallback
worker/room.ts    DocRoom Durable Object — hibernatable WebSocket relay (collab)
src/router.tsx    TanStack Router (code-based): / and /edit/$pageId
src/routes/       home + editor shell (JSON ⇄ live preview via builder-core)
src/lib/          preview (builder-core), realtime hook, sample doc
```

## Develop

```bash
pnpm install
pnpm dev          # vite + the CF plugin (Worker + SPA together)
pnpm typecheck
pnpm build
pnpm deploy       # wrangler deploy (needs CF creds + BUILDER_SERVICE_TOKEN secret)
```

Open `/edit/sample` for the built-in sample. To edit a real tenant page:
`/edit/<pageId>?tenant=https://<slug>.brandsapp.io` (the Worker proxies
`/api/builder/pages/:id` on that tenant; that endpoint lands with P2 wiring).

## Config

- `TENANT_API_BASE` (var) — default tenant builder API base.
- `BUILDER_SERVICE_TOKEN` (secret) — shared token for the tenant builder API.
- `DOC_ROOM` (Durable Object) — one room per `${tenant}:${pageId}`.
