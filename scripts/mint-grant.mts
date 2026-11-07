/**
 * Mint a builder grant from the command line.
 *
 *   BUILDER_GRANT_SECRET=… npx tsx scripts/mint-grant.mts \
 *     --sub you@example.com --name "Your Name" --tenants acme,beta --hours 8
 *
 *   BUILDER_GRANT_SECRET=… npx tsx scripts/mint-grant.mts \
 *     --sub ops@brandsapp.io --tenants '*' --hours 2
 *
 * Prints a one-time URL. Opening it sets an HttpOnly session cookie on the
 * builder and lands you in the editor; the token itself never has to live in
 * the page.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * The real issuer is the platform: it knows who someone is and which brands
 * they manage, and `/auth/claim` does not care which of the two signed the
 * grant as long as the signature checks out. This is the same code path, run
 * by hand, so the builder can be used today without a shared password living
 * in somebody's browser forever.
 *
 * Two habits worth keeping: mint for HOURS, and mint `--tenants` as the brands
 * actually being worked on. `*` is every brand in the fleet, and a grant is
 * only revoked by expiring.
 */
import { mintGrant, SLUG_RE, type Grant } from "../worker/grant"

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : undefined
}

const secret = process.env.BUILDER_GRANT_SECRET
if (!secret) {
  console.error("Set BUILDER_GRANT_SECRET (the same secret the Worker has).")
  process.exit(1)
}

const sub = arg("sub")
if (!sub) {
  console.error("--sub is required: who this grant is for, for the record.")
  process.exit(1)
}

const tenants = (arg("tenants") ?? "")
  .split(",")
  .map((t) => t.trim().toLowerCase())
  .filter(Boolean)
if (tenants.length === 0) {
  console.error("--tenants is required: a comma-separated list of slugs, or '*'.")
  process.exit(1)
}
const bad = tenants.filter((t) => t !== "*" && !SLUG_RE.test(t))
if (bad.length) {
  console.error(`Not slugs: ${bad.join(", ")}`)
  process.exit(1)
}

const hours = Number(arg("hours") ?? 8)
if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 7) {
  console.error("--hours must be between 0 and 168. A grant is revoked by expiring.")
  process.exit(1)
}

const now = Math.floor(Date.now() / 1000)
const grant: Grant = {
  sub,
  name: arg("name"),
  tenants,
  iat: now,
  exp: now + Math.round(hours * 3600),
}

const base = arg("base") ?? "https://builder.brandsapp.io"
const token = await mintGrant(secret, grant)
const to = tenants[0] && tenants[0] !== "*" ? `/?tenant=${tenants[0]}` : "/"

console.log(`\nFor:      ${grant.name ? `${grant.name} <${sub}>` : sub}`)
console.log(`Brands:   ${tenants.join(", ")}`)
console.log(`Expires:  ${new Date(grant.exp * 1000).toISOString()}  (${hours}h)`)
console.log(
  `\n${base}/auth/claim?grant=${encodeURIComponent(token)}&to=${encodeURIComponent(to)}\n`
)
console.log("Send it over something private. Anyone holding it is this person until it expires.\n")
