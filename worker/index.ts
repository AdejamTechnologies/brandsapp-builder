import { Hono } from "hono"

import { maySee, SLUG_RE, verifyGrant, type Grant } from "./grant"
import { DocRoom } from "./room"

export { DocRoom }

export interface Env {
  ASSETS: Fetcher
  DOC_ROOM: DurableObjectNamespace
  /**
   * The host brands live under, e.g. `brandsapp.io` — a tenant's API base is
   * built from this and its slug, HERE, on the server.
   */
  TENANT_HOST_SUFFIX?: string
  /**
   * A single tenant's base URL, for running against a local tenant. Honoured
   * only when `ALLOW_LOCAL_TENANT` is "1", which is never true in production.
   */
  TENANT_API_BASE?: string
  ALLOW_LOCAL_TENANT?: string
  /** shared token for calling a tenant's builder API (secret). */
  BUILDER_SERVICE_TOKEN?: string
  /** shared secret the platform signs builder grants with (secret). */
  BUILDER_GRANT_SECRET?: string
}

const app = new Hono<{ Bindings: Env; Variables: { grant: Grant } }>()

const COOKIE = "bapp_builder"

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(";")) {
    const eq = part.indexOf("=")
    if (eq < 0) continue
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim())
  }
  return undefined
}

function session(c: {
  req: { header: (k: string) => string | undefined }
  env: Env
}): Promise<Grant | null> {
  return verifyGrant(
    c.env.BUILDER_GRANT_SECRET ?? "",
    readCookie(c.req.header("cookie"), COOKIE),
    Math.floor(Date.now() / 1000)
  )
}

/**
 * Take a grant from the platform and turn it into a session.
 *
 * The platform mints one, redirects here, and this sets it as an HttpOnly
 * cookie so the token itself never has to live in the page, in history or in a
 * link somebody pastes into a chat. Until the platform grows the button,
 * `scripts/mint-grant.mts` produces the same URL from the command line.
 */
app.get("/auth/claim", async (c) => {
  const grant = await verifyGrant(
    c.env.BUILDER_GRANT_SECRET ?? "",
    c.req.query("grant"),
    Math.floor(Date.now() / 1000)
  )
  if (!grant) return c.text("That link is not valid, or has expired.", 401)

  /**
   * Where to land, and only inside this app.
   *
   * An unchecked `to` is an open redirect, and an open redirect on the page
   * that hands out sessions is the one place it really matters. A leading `//`
   * (or `/\`) is a protocol-relative URL to somebody else's host, so a single
   * leading slash is not enough of a check on its own.
   */
  const wanted = c.req.query("to") ?? "/"
  const to = /^\/(?![/\\])/.test(wanted) ? wanted : "/"

  const maxAge = Math.max(0, grant.exp - Math.floor(Date.now() / 1000))
  c.header(
    "set-cookie",
    `${COOKIE}=${encodeURIComponent(c.req.query("grant")!)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
  )
  return c.redirect(to, 302)
})

/** Who is signed in, for the editor chrome. Never echoes the token. */
app.get("/auth/session", async (c) => {
  const grant = await session(c)
  if (!grant) return c.json({ signedIn: false }, 200)
  return c.json({
    signedIn: true,
    name: grant.name ?? grant.sub,
    tenants: grant.tenants,
    expiresAt: grant.exp,
  })
})

app.post("/auth/logout", (c) => {
  c.header("set-cookie", `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)
  return c.json({ ok: true })
})

/**
 * Realtime: upgrade to the DocRoom DO for a given page. One room per
 * `${tenant}:${pageId}`.
 *
 * Gated like everything else. A room is a live copy of a brand's page being
 * edited, and anyone who could guess `acme:home` could previously join it and
 * both read and write. The cookie reaches us because the socket is
 * same-origin; the room name's own tenant is what is checked against it.
 */
app.get("/parties/doc/:room", async (c) => {
  if (c.req.header("Upgrade") !== "websocket") {
    return c.text("Expected a WebSocket upgrade", 426)
  }
  const grant = await session(c)
  if (!grant) return c.text("Not signed in", 401)
  const room = c.req.param("room")
  const slug = room.slice(0, room.indexOf(":") < 0 ? room.length : room.indexOf(":"))
  if (!maySee(grant, slug)) return c.text("Not your brand", 403)

  const id = c.env.DOC_ROOM.idFromName(room)
  return c.env.DOC_ROOM.get(id).fetch(c.req.raw)
})

/**
 * Nothing that talks to a brand runs without a session.
 *
 * `/api/health` is deliberately outside, because an uptime check that needs a
 * credential is an uptime check nobody runs.
 */
app.use("/api/*", async (c, next) => {
  if (c.req.path === "/api/health") return next()
  const grant = await session(c)
  if (!grant) return c.json({ error: "Not signed in" }, 401)
  c.set("grant", grant)
  await next()
})

/**
 * Which brand this request is for — as a SLUG, resolved to a URL here.
 *
 * `?tenant=` used to be a full base URL taken straight from the query string,
 * and `authHeaders` attached the fleet's service token to whatever it named.
 * Two holes in one line: any brand could be edited by anyone who could type
 * its address, and pointing it at a server you own posted
 * `BUILDER_SERVICE_TOKEN` — the key to every brand in the fleet — to you.
 *
 * Now the client names a brand and the server decides the address. The slug
 * has to look like a DNS label and has to be one this grant covers, so a
 * partner can only reach the brands the platform said they manage.
 */
function tenantBase(c: {
  req: { query: (k: string) => string | undefined }
  env: Env
  get: (k: "grant") => Grant
}): string {
  const slug = (c.req.query("tenant") ?? "").trim().toLowerCase()
  if (!slug) {
    // Local development against a tenant on localhost, never in production.
    if (c.env.ALLOW_LOCAL_TENANT === "1" && c.env.TENANT_API_BASE) return c.env.TENANT_API_BASE
    return ""
  }
  if (!SLUG_RE.test(slug)) return ""
  if (!maySee(c.get("grant"), slug)) return ""
  return `https://${slug}.${c.env.TENANT_HOST_SUFFIX || "brandsapp.io"}`
}

/**
 * One message for "you did not name a brand" and "that brand is not yours".
 *
 * Told apart, the second is an oracle: a partner could walk the slug space and
 * learn which brands exist by which answer came back.
 */
const NO_TENANT = "no tenant configured, or not one you can edit"

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
  if (!base) return c.json({ error: NO_TENANT }, 400)
  const res = await fetch(`${base}/api/builder/pages`, { headers: authHeaders(c.env) })
  return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } })
})

/** Create a new blank page on the tenant. */
app.post("/api/pages", async (c) => {
  const base = tenantBase(c)
  if (!base) return c.json({ error: NO_TENANT }, 400)
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
  if (!base) return c.json({ error: NO_TENANT }, 400)
  const res = await fetch(`${base}/api/builder/pages/${c.req.param("id")}`, {
    headers: authHeaders(c.env),
  })
  return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } })
})

/** Save a page's Doc to the tenant. */
app.put("/api/pages/:id", async (c) => {
  const base = tenantBase(c)
  if (!base) return c.json({ error: NO_TENANT }, 400)
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
  if (!base) return c.json({ error: NO_TENANT }, 400)
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
  if (!base) return c.json({ error: NO_TENANT }, 400)
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
