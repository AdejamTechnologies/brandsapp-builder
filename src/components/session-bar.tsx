import { useEffect, useState } from "react"
import { useSearch } from "@tanstack/react-router"

/**
 * Who is signed in, and whether this brand is theirs to edit.
 *
 * The builder holds no accounts: the platform decides who somebody is and
 * which brands they manage, and says so in a short-lived signed grant that
 * `/auth/claim` turns into an HttpOnly cookie. This reads back the part of it
 * that is safe to show.
 *
 * It exists because the failure it describes is otherwise unreadable. Without
 * a session every panel in the editor degrades politely — the link picker
 * falls back to a text box, the page list stays empty, saving reports a
 * failure — and none of them says the one thing that is actually wrong. A
 * person would conclude the builder is broken.
 */
interface Session {
  signedIn: boolean
  name?: string
  tenants?: string[]
  expiresAt?: number
}

export function SessionBar() {
  const search = useSearch({ strict: false }) as { tenant?: string }
  const tenant = (search.tenant ?? "").trim().toLowerCase()
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/auth/session", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? (r.json() as Promise<Session>) : { signedIn: false }))
      // A failed request is not a signed-out session, and saying so would send
      // somebody looking for a sign-in link that will not help them.
      .catch(() => null)
      .then((s) => {
        if (!cancelled && s) setSession(s)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!session) return null

  if (!session.signedIn) {
    return (
      <Bar tone="warn">
        <strong className="font-semibold">Not signed in.</strong> The builder takes
        its session from the platform — open it from there, or use a grant link.
        Demo pages still work; a brand&rsquo;s pages will not load or save.
      </Bar>
    )
  }

  const allowed =
    !tenant || (session.tenants ?? []).includes("*") || (session.tenants ?? []).includes(tenant)
  if (!allowed) {
    return (
      <Bar tone="warn">
        <strong className="font-semibold">{tenant}</strong> is not one of the
        brands you have been granted, so its pages will not load or save.
      </Bar>
    )
  }

  // Signed in, and in the right place: say so once, quietly, and get out of
  // the way. Whose session is open matters when two people share a screen.
  return (
    <span className="text-xs text-muted-foreground">
      {session.name}
      {tenant ? ` · ${tenant}` : ""}
    </span>
  )
}

function Bar({ tone, children }: { tone: "warn"; children: React.ReactNode }) {
  return (
    <span
      role="status"
      className={
        tone === "warn"
          ? "rounded-md bg-amber-100 px-2 py-1 text-xs leading-snug text-amber-900 dark:bg-amber-950 dark:text-amber-100"
          : ""
      }
    >
      {children}
    </span>
  )
}
