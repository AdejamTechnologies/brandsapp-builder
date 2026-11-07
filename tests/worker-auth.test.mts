/**
 * The door, from outside: what the Worker actually answers.
 *
 * `tests/grant.test.mts` proves a grant cannot be forged. This proves the
 * routes ask for one — which is the half that was missing, and the half that
 * was exploitable.
 *
 * Every outbound fetch is captured rather than performed, so the two things
 * that mattered can be asserted directly: WHERE a request would have gone, and
 * WHAT credential would have gone with it.
 *
 * Run: npx tsx tests/worker-auth.test.mts
 */

import assert from "node:assert/strict"
import { register } from "node:module"

/**
 * `worker/room.ts` imports `cloudflare:workers`, which only the Workers
 * runtime can resolve. The Durable Object is not what is under test here — the
 * routing in front of it is — so the specifier is answered with a stub base
 * class, and the Worker module graph loads under plain node.
 */
register(
  "data:text/javascript," +
    encodeURIComponent(`
      export async function resolve(spec, ctx, next) {
        if (spec === "cloudflare:workers") {
          return { url: "cfstub:workers", shortCircuit: true, format: "module" }
        }
        return next(spec, ctx)
      }
      export async function load(url, ctx, next) {
        if (url === "cfstub:workers") {
          return {
            format: "module",
            shortCircuit: true,
            source: "export class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env } }",
          }
        }
        return next(url, ctx)
      }
    `)
)

const app = (await import("../worker/index")).default
const { mintGrant } = await import("../worker/grant")
type Grant = Awaited<ReturnType<typeof import("../worker/grant").verifyGrant>> & object

let passed = 0
async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn()
  } catch (e) {
    console.log(`  ✗ ${name}`)
    throw e
  }
  passed++
  console.log(`  ✓ ${name}`)
}

const SECRET = "test-grant-secret"
const FLEET_TOKEN = "test-fleet-token"
const now = Math.floor(Date.now() / 1000)

const env = {
  ASSETS: { fetch: async () => new Response("spa") },
  DOC_ROOM: {
    idFromName: (n: string) => n,
    get: () => ({ fetch: async () => new Response(null, { status: 101 }) }),
  },
  TENANT_HOST_SUFFIX: "brandsapp.io",
  TENANT_API_BASE: "",
  ALLOW_LOCAL_TENANT: "0",
  BUILDER_SERVICE_TOKEN: FLEET_TOKEN,
  BUILDER_GRANT_SECRET: SECRET,
} as unknown as Parameters<typeof app.request>[2]

/** Every outbound call the Worker tried to make during one request. */
let calls: Array<{ url: string; token: string | null }> = []
const realFetch = globalThis.fetch
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
  const headers = new Headers(init?.headers ?? {})
  calls.push({ url, token: headers.get("x-builder-token") })
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}) as typeof fetch

async function get(path: string, cookie?: string) {
  calls = []
  return app.request(
    path,
    { headers: cookie ? { cookie: `bapp_builder=${encodeURIComponent(cookie)}` } : {} },
    env
  )
}

const staff: Grant = { sub: "ops", tenants: ["*"], iat: now, exp: now + 3600 }
const partner: Grant = { sub: "agency", tenants: ["acme"], iat: now, exp: now + 3600 }

console.log("signed out")

await test("a brand's pages cannot be listed", async () => {
  const res = await get("/api/pages?tenant=acme")
  assert.equal(res.status, 401)
  assert.deepEqual(calls, [], "it called a tenant anyway")
})

await test("every route that talks to a brand is covered, not just the obvious ones", async () => {
  for (const path of [
    "/api/pages?tenant=acme",
    "/api/pages/home?tenant=acme",
    "/api/endpoints?tenant=acme",
    "/api/entities?tenant=acme",
  ]) {
    const res = await get(path)
    assert.equal(res.status, 401, path)
    assert.deepEqual(calls, [], path)
  }
})

await test("the live editing socket is not open to the world", async () => {
  calls = []
  const res = await app.request(
    "/parties/doc/acme:home",
    { headers: { Upgrade: "websocket" } },
    env
  )
  assert.equal(res.status, 401)
})

await test("health stays open, because an uptime check cannot hold a credential", async () => {
  const res = await get("/api/health")
  assert.equal(res.status, 200)
})

console.log("\nsigned in")

await test("a grant link sets an HttpOnly session and lands inside the app", async () => {
  const token = await mintGrant(SECRET, staff)
  const res = await app.request(
    `/auth/claim?grant=${encodeURIComponent(token)}&to=${encodeURIComponent("/edit/home?tenant=acme")}`,
    {},
    env
  )
  assert.equal(res.status, 302)
  assert.equal(res.headers.get("location"), "/edit/home?tenant=acme")
  const cookie = res.headers.get("set-cookie") ?? ""
  assert.match(cookie, /HttpOnly/)
  assert.match(cookie, /Secure/)
  assert.match(cookie, /SameSite=Lax/)
})

await test("the landing place cannot be somebody else's site", async () => {
  // An open redirect matters most on the page that hands out sessions. A
  // single leading slash is not enough of a check: `//evil.example` is a
  // protocol-relative URL to another host.
  const token = await mintGrant(SECRET, staff)
  for (const to of ["//evil.example", "/\\evil.example", "https://evil.example"]) {
    const res = await app.request(
      `/auth/claim?grant=${encodeURIComponent(token)}&to=${encodeURIComponent(to)}`,
      {},
      env
    )
    assert.equal(res.headers.get("location"), "/", to)
  }
})

await test("an expired link is not a session", async () => {
  const token = await mintGrant(SECRET, { ...staff, exp: now - 1 })
  const res = await app.request(`/auth/claim?grant=${encodeURIComponent(token)}`, {}, env)
  assert.equal(res.status, 401)
  assert.equal(res.headers.get("set-cookie"), null)
})

await test("the session endpoint never echoes the token back", async () => {
  const token = await mintGrant(SECRET, partner)
  const res = await get("/auth/session", token)
  const body = await res.text()
  assert.match(body, /"signedIn":true/)
  assert.ok(!body.includes(token), "the grant came back in the response body")
})

console.log("\nwhich brand, and where the token goes")

await test("staff reach a brand, at the address the SERVER built", async () => {
  const token = await mintGrant(SECRET, staff)
  const res = await get("/api/pages?tenant=acme", token)
  assert.equal(res.status, 200)
  assert.equal(calls.length, 1)
  assert.equal(calls[0]!.url, "https://acme.brandsapp.io/api/builder/pages")
  assert.equal(calls[0]!.token, FLEET_TOKEN)
})

await test("a partner cannot reach a brand it was not granted", async () => {
  const token = await mintGrant(SECRET, partner)
  const res = await get("/api/pages?tenant=someone-else", token)
  assert.equal(res.status, 400)
  assert.deepEqual(calls, [], "it called the other brand anyway")
})

await test("THE HOLE: ?tenant= can no longer name a host, so the fleet token cannot be posted to one", async () => {
  /**
   * This is what this whole file exists for. `?tenant=` used to be a full base
   * URL taken from the query string, and the Worker attached
   * BUILDER_SERVICE_TOKEN — the key to every brand in the fleet — to whatever
   * it named. Signed in or not, these must reach nobody.
   */
  const token = await mintGrant(SECRET, staff)
  for (const hostile of [
    "https://evil.example",
    "http://evil.example",
    "//evil.example",
    "acme.brandsapp.io.evil.example",
    "acme/../../evil",
    "acme%2Eevil%2Eexample",
  ]) {
    const res = await get(`/api/pages?tenant=${encodeURIComponent(hostile)}`, token)
    assert.equal(res.status, 400, hostile)
    assert.deepEqual(calls, [], `the fleet token was sent for: ${hostile}`)
  }
})

await test("a brand named with capitals or spaces is still just a brand", async () => {
  const token = await mintGrant(SECRET, staff)
  const res = await get("/api/pages?tenant=ACME", token)
  assert.equal(res.status, 200)
  assert.equal(calls[0]!.url, "https://acme.brandsapp.io/api/builder/pages")
})

await test("the local-tenant override is off unless it is switched on", async () => {
  const token = await mintGrant(SECRET, staff)
  const configured = { ...env, TENANT_API_BASE: "http://localhost:8787" } as typeof env
  calls = []
  const off = await app.request(
    "/api/pages",
    { headers: { cookie: `bapp_builder=${encodeURIComponent(token)}` } },
    configured
  )
  assert.equal(off.status, 400)
  assert.deepEqual(calls, [])

  calls = []
  const on = await app.request(
    "/api/pages",
    { headers: { cookie: `bapp_builder=${encodeURIComponent(token)}` } },
    { ...configured, ALLOW_LOCAL_TENANT: "1" } as typeof env
  )
  assert.equal(on.status, 200)
  assert.equal(calls[0]!.url, "http://localhost:8787/api/builder/pages")
})

globalThis.fetch = realFetch
console.log(`\n${passed} passed`)
