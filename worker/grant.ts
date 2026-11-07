/**
 * Who may open the builder, and which brands they may touch.
 *
 * ── Why a signed grant and not a login ────────────────────────────────────
 *
 * There are already three places a person can have an account — the platform,
 * a tenant, and the admin console — and the builder is used by staff, by
 * partner agencies and (soon) by designers selling templates. A fourth user
 * store, with its own passwords and resets, would be the wrong answer to all
 * of them.
 *
 * So the builder holds no accounts. The PLATFORM decides who someone is and
 * which brands they may edit, and says so in a short-lived token signed with a
 * secret the two of them share. The builder only has to check the signature
 * and the clock. Revocation is the expiry: a grant is minted for hours, not
 * months, and a partner removed from a brand simply stops being given one.
 *
 * ── The shape ─────────────────────────────────────────────────────────────
 *
 *   base64url(JSON payload) "." base64url(HMAC-SHA256(secret, payload))
 *
 * Deliberately not a JWT: a JWT carries its algorithm in its own header, which
 * is the source of the entire `alg: none` family of bugs. Here the algorithm
 * is not negotiable because it is not written down.
 *
 * ── What it is NOT ────────────────────────────────────────────────────────
 *
 * It is not the fleet service token. `BUILDER_SERVICE_TOKEN` opens every brand
 * in the fleet and lives only in the Worker; this is a separate secret used
 * only for signing, so a signing key that leaks cannot be replayed against a
 * tenant directly.
 */

/** Tenant slugs are a DNS label: that is the whole validation. */
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

export interface Grant {
  /** The platform's id for this person. Recorded, never used for access. */
  sub: string
  /** Shown in the editor chrome, so it is obvious whose session is open. */
  name?: string
  /**
   * The brands this person may edit. `["*"]` is every brand and is for staff;
   * a partner agency gets the slugs it actually manages.
   */
  tenants: string[]
  /** Issued at, and expires at — both unix seconds. */
  iat: number
  exp: number
}

const encoder = new TextEncoder()

function b64url(bytes: Uint8Array): string {
  let s = ""
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * Typed `Uint8Array<ArrayBuffer>`, not the default `Uint8Array`.
 *
 * The default parameterises over `ArrayBufferLike`, which includes
 * `SharedArrayBuffer`, and WebCrypto will not take one of those — so the array
 * is built on an `ArrayBuffer` named up front rather than cast at each call.
 */
function unb64url(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4))
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  )
}

/** Mint a grant. Used by the platform, and by `scripts/mint-grant.mts`. */
export async function mintGrant(secret: string, grant: Grant): Promise<string> {
  // WebCrypto refuses a zero-length HMAC key with a DOMException; saying it
  // plainly beats a stack trace out of `importKey`.
  if (!secret) throw new Error("A grant cannot be signed without a secret.")
  const payload = b64url(encoder.encode(JSON.stringify(grant)))
  const sig = await crypto.subtle.sign("HMAC", await signingKey(secret), encoder.encode(payload))
  return `${payload}.${b64url(new Uint8Array(sig))}`
}

/**
 * Check a grant, or return null. Never throws, never says which check failed.
 *
 * `crypto.subtle.verify` rather than comparing two strings: the comparison is
 * constant-time by construction, so a forged signature cannot be refined one
 * byte at a time by measuring how long the answer takes.
 */
export async function verifyGrant(
  secret: string,
  token: string | undefined | null,
  nowSeconds: number
): Promise<Grant | null> {
  if (!secret || !token) return null
  const dot = token.indexOf(".")
  if (dot <= 0 || dot === token.length - 1) return null
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]+$/.test(sig)) return null

  let ok = false
  try {
    ok = await crypto.subtle.verify(
      "HMAC",
      await signingKey(secret),
      unb64url(sig),
      encoder.encode(payload)
    )
  } catch {
    return null
  }
  if (!ok) return null

  let grant: Grant
  try {
    grant = JSON.parse(new TextDecoder().decode(unb64url(payload))) as Grant
  } catch {
    return null
  }

  if (typeof grant?.sub !== "string" || !grant.sub) return null
  if (!Array.isArray(grant.tenants) || grant.tenants.length === 0) return null
  if (!grant.tenants.every((t) => t === "*" || SLUG_RE.test(t))) return null
  if (typeof grant.exp !== "number" || grant.exp <= nowSeconds) return null
  // A grant from the future is a clock problem or a forgery attempt; either
  // way it is not something to act on.
  if (typeof grant.iat !== "number" || grant.iat > nowSeconds + 300) return null
  return grant
}

/** May this grant touch this brand? */
export function maySee(grant: Grant | null | undefined, slug: string): boolean {
  if (!grant) return false
  if (!SLUG_RE.test(slug)) return false
  return grant.tenants.includes("*") || grant.tenants.includes(slug)
}
