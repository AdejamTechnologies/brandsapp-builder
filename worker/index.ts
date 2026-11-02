import { Hono } from "hono"

import { DocRoom } from "./room"

export { DocRoom }

export interface Env {
  ASSETS: Fetcher
  DOC_ROOM: DurableObjectNamespace
  TENANT_API_BASE: string
  /** shared token for calling a tenant's builder API (secret). */
  BUILDER_SERVICE_TOKEN?: string
}

const app = new Hono<{ Bindings: Env }>()

/**
 * Realtime: upgrade to the DocRoom DO for a given page. One room per
 * `${tenant}:${pageId}`. The client connects to /parties/doc/<room>.
 */
app.get("/parties/doc/:room", (c) => {
  if (c.req.header("Upgrade") !== "websocket") {
    return c.text("Expected a WebSocket upgrade", 426)
  }
  const id = c.env.DOC_ROOM.idFromName(c.req.param("room"))
  return c.env.DOC_ROOM.get(id).fetch(c.req.raw)
})

/** Resolve the tenant's builder API base (per-request override in dev). */
function tenantBase(c: { req: { query: (k: string) => string | undefined }; env: Env }): string {
  return c.req.query("tenant") || c.env.TENANT_API_BASE || ""
}

function authHeaders(env: Env): HeadersInit {
  return env.BUILDER_SERVICE_TOKEN
    ? { "x-builder-token": env.BUILDER_SERVICE_TOKEN }
    : {}
}

/**
 * The destinations the link settings can offer, from the tenant.
 *
 * Per brand, not hard-coded: `/shop` exists only where Commerce is installed,
 * so the picker is built from what this brand actually has and cannot offer a
 * 404. The tenant builds the list from lib/public-endpoints.ts, the same
 * catalogue its public nav reads.
 */
app.get("/api/endpoints", async (c) => {
  const base = tenantBase(c)
  // Not a 400: a builder opened with no tenant (the demo pages) still has to
  // work, and the settings panel already falls back to a plain text box when
  // it has no list. An error here would make the field unusable instead.
  if (!base) return c.json({ endpoints: [] })
  try {
    const res = await fetch(`${base}/api/builder/endpoints`, {
      headers: authHeaders(c.env),
    })
    if (!res.ok) return c.json({ endpoints: [] })
    return new Response(res.body, {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  } catch {
    // Same reasoning: a picker that degrades to a text box beats a dead field.
    return c.json({ endpoints: [] })
  }
})

/**
 * Search the tenant's resources for the link picker, or list the resource
 * TYPES it has when no `kind` is given.
 *
 * Query is forwarded verbatim rather than rebuilt: the tenant owns what the
 * parameters mean, and a proxy that reinterprets them is a second place to get
 * them wrong. Degrades to an empty result for the same reason /api/endpoints
 * does — the panel falls back to a plain text box, which beats a dead field.
 */
app.get("/api/entities", async (c) => {
  const base = tenantBase(c)
  const empty = c.req.query("kind") ? { items: [] } : { kinds: [] }
  if (!base) return c.json(empty)
  try {
    const qs = new URL(c.req.url).search
    const res = await fetch(`${base}/api/builder/entities${qs}`, {
      headers: authHeaders(c.env),
    })
    if (!res.ok) return c.json(empty)
    return new Response(res.body, {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  } catch {
    return c.json(empty)
  }
})

/** List the tenant's pages (multi-page project switcher). */
app.get("/api/pages", async (c) => {
  const base = tenantBase(c)
  if (!base) return c.json({ error: "no tenant configured" }, 400)
  const res = await fetch(`${base}/api/builder/pages`, { headers: authHeaders(c.env) })
  return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } })
})

/** Create a new blank page on the tenant. */
app.post("/api/pages", async (c) => {
  const base = tenantBase(c)
  if (!base) return c.json({ error: "no tenant configured" }, 400)
  const res = await fetch(`${base}/api/builder/pages`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders(c.env) },
    body: await c.req.text(),
  })
  return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } })
})

/** Load a page's Doc from the tenant. */
app.get("/api/pages/:id", async (c) => {
  const base = tenantBase(c)
  if (!base) return c.json({ error: "no tenant configured" }, 400)
  const res = await fetch(`${base}/api/builder/pages/${c.req.param("id")}`, {
    headers: authHeaders(c.env),
  })
  return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } })
})

/** Save a page's Doc to the tenant. */
app.put("/api/pages/:id", async (c) => {
  const base = tenantBase(c)
  if (!base) return c.json({ error: "no tenant configured" }, 400)
  const res = await fetch(`${base}/api/builder/pages/${c.req.param("id")}`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...authHeaders(c.env) },
    body: await c.req.text(),
  })
  return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } })
})

/** Upload an asset to the tenant (bytes streamed through to B2 server-side). */
app.post("/api/upload", async (c) => {
  const base = tenantBase(c)
  if (!base) return c.json({ error: "no tenant configured" }, 400)
  const name = c.req.query("name") ?? "upload"
  const res = await fetch(`${base}/api/builder/upload?name=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: {
      "content-type": c.req.header("content-type") || "application/octet-stream",
      ...authHeaders(c.env),
    },
    body: await c.req.arrayBuffer(),
  })
  return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } })
})

/** Publish / unpublish a page on the tenant. */
app.post("/api/pages/:id/publish", async (c) => {
  const base = tenantBase(c)
  if (!base) return c.json({ error: "no tenant configured" }, 400)
  const res = await fetch(`${base}/api/builder/pages/${c.req.param("id")}/publish`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders(c.env) },
    body: await c.req.text(),
  })
  return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } })
})

app.get("/api/health", (c) => c.json({ ok: true, service: "brandsapp-builder" }))

// Everything else → the SPA (assets binding handles static + SPA fallback).
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
