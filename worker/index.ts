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

app.get("/api/health", (c) => c.json({ ok: true, service: "brandsapp-builder" }))

// Everything else → the SPA (assets binding handles static + SPA fallback).
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
