import { useEffect, useState, type ReactNode } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { ArrowRight, FileText, Hammer, MousePointerClick } from "lucide-react"

import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"

interface PageRow {
  id: string
  title: string
  slug: string
  status: string
  isHomepage: number
  unpublishedChanges?: boolean
}

/**
 * Home: the signed-in brand's pages, then the demo pages.
 *
 * It used to open on two empty boxes — "page id" and a brand slug with
 * "acme" in it — even right after a sign-in link that had just named the
 * brand. Nobody knows a page's id; the builder already had the endpoint that
 * lists a brand's pages (`/api/pages`). So the brand comes from the link (or
 * the grant's only brand) and its pages are listed to pick from. The raw form
 * stays below for staff who do have an id (23 Nov 2026).
 */
export function HomePage() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { tenant?: string }
  const [tenant, setTenant] = useState(search.tenant ?? "")
  const [pageId, setPageId] = useState("")
  const [pages, setPages] = useState<PageRow[] | null>(null)
  const [pagesError, setPagesError] = useState<string | null>(null)

  // No brand in the address: the grant's own, when it covers exactly one.
  useEffect(() => {
    if (tenant) return
    fetch("/auth/session")
      .then((r) => r.json())
      .then((raw) => {
        // Our own Worker route, but `json()` is typed `unknown`.
        const s = raw as { tenants?: string[] }
        const only = s.tenants?.length === 1 ? s.tenants[0] : undefined
        if (only && only !== "*") setTenant(only)
      })
      .catch(() => {})
  }, [tenant])

  useEffect(() => {
    const slug = tenant.trim().toLowerCase()
    setPages(null)
    setPagesError(null)
    if (!slug) return
    let live = true
    fetch(`/api/pages?tenant=${encodeURIComponent(slug)}`)
      .then(async (r) => {
        const body = (await r.json().catch(() => ({}))) as { pages?: unknown }
        if (!live) return
        if (r.ok && Array.isArray(body.pages)) setPages(body.pages as PageRow[])
        else if (r.status === 401) setPagesError("This brand did not accept the builder's key. Check its builder token.")
        else setPagesError("Could not load this brand's pages.")
      })
      .catch(() => live && setPagesError("Could not reach this brand."))
    return () => {
      live = false
    }
  }, [tenant])

  const open = () => {
    const id = pageId.trim()
    if (!id) return
    navigate({
      to: "/edit/$pageId",
      params: { pageId: id },
      search: tenant.trim() ? { tenant: tenant.trim().toLowerCase() } : undefined,
    })
  }

  const slug = tenant.trim().toLowerCase()

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Central Builder</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        The shared visual editor for BrandsApp pages. The canvas renders with the same{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-[12px]">builder-core</code> engine the tenant
        Workers publish with — what you see is what ships.
      </p>

      {slug && (
        <section className="mt-6 rounded-xl border border-border bg-background">
          <div className="border-b border-border px-4 py-3">
            <div className="text-sm font-semibold text-foreground">{slug}’s pages</div>
            <div className="text-xs text-muted-foreground">Saving writes a draft; the brand publishes it.</div>
          </div>
          {pagesError ? (
            <p className="px-4 py-4 text-sm text-destructive">{pagesError}</p>
          ) : pages === null ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">Loading pages…</p>
          ) : pages.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">This brand has no pages yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pages.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/edit/$pageId"
                    params={{ pageId: p.id }}
                    search={{ tenant: slug }}
                    className="flex min-h-14 items-center gap-3 px-4 py-2 no-underline hover:bg-accent"
                  >
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{p.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">/{p.slug}</span>
                    </span>
                    {p.isHomepage === 1 && <Badge>Homepage</Badge>}
                    <Badge>
                      {p.status === "published"
                        ? p.unpublishedChanges
                          ? "Changes not published"
                          : "Live"
                        : p.status === "archived"
                          ? "Archived"
                          : "Draft"}
                    </Badge>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Link
        to="/edit/$pageId"
        params={{ pageId: "sample" }}
        className="group mt-6 flex items-center justify-between rounded-xl border border-border bg-background p-4 no-underline transition-colors hover:border-ring"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-foreground">
            <MousePointerClick className="size-4.5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Open the sample page</div>
            <div className="text-xs text-muted-foreground">A local playground — drag, edit, style. No sign-in.</div>
          </div>
        </div>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </Link>

      <Link
        to="/edit/$pageId"
        params={{ pageId: "bolt" }}
        className="group mt-3 flex items-center justify-between rounded-xl border border-border bg-background p-4 no-underline transition-colors hover:border-ring"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-foreground">
            <Hammer className="size-4.5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Open the Bolt World trial page</div>
            <div className="text-xs text-muted-foreground">
              A real prospect: repairs and building supplies, two catalogues, WhatsApp ordering.
            </div>
          </div>
        </div>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </Link>

      <div className="mt-3 rounded-xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">Open a page by its id</div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          For staff with an id to hand. The brand must be one you have been granted; the address is
          built on the server, so a URL typed here would reach nothing.
        </p>
        <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Input className="sm:w-40" placeholder="Page id" value={pageId} onChange={(e) => setPageId(e.target.value)} />
          <Input
            className="sm:min-w-48 sm:flex-1"
            placeholder="Brand, e.g. fresh"
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
          />
          <Button className="min-h-10" onClick={open} disabled={!pageId.trim()}>
            Open
          </Button>
        </div>
      </div>

      {/* Keyboard and mouse tips — of no use on a touch screen. */}
      <p className="mt-6 hidden text-xs leading-relaxed text-muted-foreground md:block">
        Click to select · double-click text to edit · drag palette chips or layers onto the canvas · ⌘Z/⌘⇧Z
        undo/redo · ⌘D duplicate · ⌘C/⌘V copy-paste · Delete to remove. Realtime collab runs through the
        DocRoom DO, which is gated on the same session the rest of this is.
      </p>
    </main>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="hidden shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground sm:inline">
      {children}
    </span>
  )
}
