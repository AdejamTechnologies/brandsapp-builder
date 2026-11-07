/**
 * The builder's door.
 *
 * Until this shipped there wasn't one: `?tenant=` was a full URL taken from
 * the query string, and the Worker attached the fleet's service token to
 * whatever it named. So anyone who could open the builder could edit any
 * brand — and could point `?tenant=` at a server they owned and be handed
 * `BUILDER_SERVICE_TOKEN`, the key to every brand there is.
 *
 * Run: npx tsx tests/grant.test.mts
 */

import assert from "node:assert/strict"

import { maySee, mintGrant, SLUG_RE, verifyGrant, type Grant } from "../worker/grant"

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

const SECRET = "a-test-signing-secret"
const now = Math.floor(Date.now() / 1000)
const valid: Grant = { sub: "ops@brandsapp.io", tenants: ["acme"], iat: now, exp: now + 3600 }

console.log("builder grants")

await test("a grant this secret signed is accepted", async () => {
  const token = await mintGrant(SECRET, valid)
  const back = await verifyGrant(SECRET, token, now)
  assert.equal(back?.sub, "ops@brandsapp.io")
  assert.deepEqual(back?.tenants, ["acme"])
})

await test("another secret's grant is refused", async () => {
  const token = await mintGrant("a-different-secret", valid)
  assert.equal(await verifyGrant(SECRET, token, now), null)
})

await test("an edited payload is refused", async () => {
  // The whole point: promote yourself from one brand to all of them and the
  // signature stops matching.
  const token = await mintGrant(SECRET, valid)
  const [, sig] = token.split(".")
  const forged = Buffer.from(JSON.stringify({ ...valid, tenants: ["*"] }))
    .toString("base64url")
  assert.equal(await verifyGrant(SECRET, `${forged}.${sig}`, now), null)
})

await test("an expired grant is refused", async () => {
  // Expiry IS revocation here — there is no session table to delete a row from.
  const token = await mintGrant(SECRET, { ...valid, exp: now - 1 })
  assert.equal(await verifyGrant(SECRET, token, now), null)
})

await test("a grant issued in the future is refused", async () => {
  const token = await mintGrant(SECRET, { ...valid, iat: now + 3600, exp: now + 7200 })
  assert.equal(await verifyGrant(SECRET, token, now), null)
})

await test("rubbish is refused rather than thrown at", async () => {
  for (const bad of ["", ".", "a.", ".b", "not-a-token", "a.b.c", "}{.}{", "x".repeat(5000)]) {
    assert.equal(await verifyGrant(SECRET, bad, now), null, bad.slice(0, 20))
  }
  assert.equal(await verifyGrant(SECRET, undefined, now), null)
})

await test("a Worker with no secret configured lets nobody in", async () => {
  // Fails CLOSED. Failing open would mean a deploy that happened before
  // `wrangler secret put` admitted the whole world.
  const token = await mintGrant(SECRET, valid)
  assert.equal(await verifyGrant("", token, now), null)
  // And signing without one is refused outright, rather than throwing a
  // DOMException out of WebCrypto at whoever ran the minting script.
  await assert.rejects(() => mintGrant("", valid), /without a secret/)
})

await test("a grant naming something that is not a slug is refused", async () => {
  // The slug becomes a hostname, so this is what stops `../` and `evil.com`
  // ever reaching the fetch.
  for (const t of ["https://evil.example", "acme.brandsapp.io", "../acme", "AC ME", "-acme", ""]) {
    const token = await mintGrant(SECRET, { ...valid, tenants: [t] })
    assert.equal(await verifyGrant(SECRET, token, now), null, t)
  }
})

console.log("\nwho may edit what")

await test("a partner reaches its own brands and no others", () => {
  const partner: Grant = { ...valid, tenants: ["acme", "beta"] }
  assert.equal(maySee(partner, "acme"), true)
  assert.equal(maySee(partner, "beta"), true)
  assert.equal(maySee(partner, "gamma"), false)
})

await test("staff reach everything, and nobody reaches a non-slug", () => {
  const staff: Grant = { ...valid, tenants: ["*"] }
  assert.equal(maySee(staff, "anything"), true)
  assert.equal(maySee(staff, "evil.example"), false)
  assert.equal(maySee(staff, "../etc"), false)
  assert.equal(maySee(null, "acme"), false)
})

await test("a slug is a DNS label and nothing else", () => {
  for (const good of ["a", "acme", "acme-2", "a".repeat(63)]) assert.ok(SLUG_RE.test(good), good)
  for (const bad of ["", "-a", "a-", "A", "a_b", "a.b", "a/b", "a".repeat(64), "a b"]) {
    assert.ok(!SLUG_RE.test(bad), bad)
  }
})

console.log(`\n${passed} passed`)
