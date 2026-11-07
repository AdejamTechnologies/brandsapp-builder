# Who may open the builder

The builder holds no accounts. The **platform** decides who somebody is and
which brands they may edit; the builder only checks a signature and a clock.

This is deliberate. There are already three places a person can have an account
— the platform, a tenant, and the admin console — and the builder is used by
staff, by partner agencies, and (next) by designers selling templates. A fourth
user store with its own passwords and resets would be the wrong answer to all of
them.

## What was wrong before

`?tenant=` was a **full base URL** taken straight from the query string, and the
Worker attached `BUILDER_SERVICE_TOKEN` to whatever it named. The editor's own
help text said `Add ?tenant=<url> to manage pages.` Two holes in one line:

1. Anyone who could open the builder could edit **any** brand, by typing its
   address.
2. Pointing `?tenant=` at a server you control posted `BUILDER_SERVICE_TOKEN` —
   the key to **every brand in the fleet** — to you.

Now the client names a brand by **slug** and the Worker builds the address
itself, from `TENANT_HOST_SUFFIX`, only for a slug the caller's grant covers.

## The grant

```
base64url(JSON payload) "." base64url(HMAC-SHA256(BUILDER_GRANT_SECRET, payload))
```

```jsonc
{
  "sub": "user_01H…",        // the platform's id for this person. Recorded, never used for access.
  "name": "Ada Okafor",      // optional; shown in the builder chrome
  "tenants": ["acme", "beta"], // slugs they may edit, or ["*"] for staff
  "iat": 1762500000,          // unix seconds
  "exp": 1762528800           // unix seconds — this IS the revocation
}
```

Not a JWT on purpose: a JWT names its own algorithm in its own header, which is
where the whole `alg: none` family of bugs comes from. Here the algorithm is not
negotiable because it is not written down.

**`exp` is the only revocation.** There is no session table to delete a row
from. Mint for **hours**, and mint `tenants` as the brands actually being worked
on — `["*"]` is the entire fleet.

`BUILDER_GRANT_SECRET` is **not** `BUILDER_SERVICE_TOKEN`. The second opens
every brand and lives only in the Worker; keeping them separate means a leaked
signing key cannot be replayed against a tenant directly.

## What the platform has to build

One action — "Open in builder" — on a brand, for a staff member or for a partner
who manages it:

1. Mint a grant as above, signed with the shared `BUILDER_GRANT_SECRET`.
2. Redirect the browser to:

```
https://builder.brandsapp.io/auth/claim
  ?grant=<token>
  &to=%2Fedit%2F<pageId>%3Ftenant%3D<slug>
```

`/auth/claim` verifies the signature and the clock, sets an **HttpOnly, Secure,
SameSite=Lax** cookie, and redirects to `to` — which must be a path inside the
builder, so the token never lives in the page, in history, or in a link somebody
pastes into a chat. A `to` that points anywhere else lands on `/` instead; an
open redirect matters most on the page that hands out sessions.

## Until that exists

```sh
BUILDER_GRANT_SECRET=… npx tsx scripts/mint-grant.mts \
  --sub you@example.com --name "Your Name" --tenants acme --hours 8
```

It prints the same URL the platform will. Same code path, run by hand — so the
builder is usable today without a shared password living in somebody's browser
for ever. Send the link over something private: anyone holding it **is** that
person until it expires.

## Local development

The session check runs in `pnpm dev` too, so it needs the same two things:

```sh
# .dev.vars
BUILDER_GRANT_SECRET = "anything-local"
ALLOW_LOCAL_TENANT   = "1"
TENANT_API_BASE      = "http://localhost:8787"
```

```sh
BUILDER_GRANT_SECRET=anything-local npx tsx scripts/mint-grant.mts \
  --sub me --tenants '*' --hours 24 --base http://localhost:5173
```

Open the printed link once and the cookie lasts the day. There is no
"development bypasses auth" switch on purpose — a bypass is a thing that
eventually ships.

The demo pages need none of this: they hold no brand, so nothing on them calls
a tenant.

## What is gated

Everything that talks to a brand: `/api/pages`, `/api/pages/:id` (load, save,
publish), `/api/upload`, `/api/endpoints`, `/api/entities` — and
`/parties/doc/:room`, the live editing socket, whose room name carries the slug
that gets checked. Previously anyone who could guess `acme:home` could join a
brand's page as it was being edited and both read and write it.

`/api/health` stays open, because an uptime check that needs a credential is an
uptime check nobody runs.

"You did not name a brand" and "that brand is not yours" give the **same**
answer. Told apart, the second is an oracle: a partner could walk the slug space
and learn which brands exist from which refusal came back.

## Config

| name | kind | what |
|---|---|---|
| `TENANT_HOST_SUFFIX` | var | brands live at `https://<slug>.<suffix>` |
| `TENANT_API_BASE` | var | one tenant's base URL, for local work only |
| `ALLOW_LOCAL_TENANT` | var | `"1"` honours the above. Never `"1"` in production |
| `BUILDER_SERVICE_TOKEN` | secret | calls a tenant's builder API. Opens every brand |
| `BUILDER_GRANT_SECRET` | secret | signs and verifies grants. Shared with the platform |

Both secrets go in with `wrangler secret put <name>`. With no
`BUILDER_GRANT_SECRET` set, verification fails **closed** — a deploy that
happens before the secret is set admits nobody, rather than everybody.

Covered by `tests/grant.test.mts` (the token cannot be forged) and
`tests/worker-auth.test.mts` (the routes ask for one, and the fleet token cannot
be sent to an address a caller chose). `pnpm test`.
