import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { ArrowRight, MousePointerClick } from "lucide-react"

import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"

export function HomePage() {
  const navigate = useNavigate()
  const [pageId, setPageId] = useState("")
  const [tenant, setTenant] = useState("")

  const open = () => {
    const id = pageId.trim()
    if (!id) return
    navigate({
      to: "/edit/$pageId",
      params: { pageId: id },
      search: tenant.trim() ? { tenant: tenant.trim() } : undefined,
    })
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-14">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Central Builder</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        The shared visual editor for BrandsApp pages. The canvas renders with the same{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-[12px]">builder-core</code> engine the tenant
        Workers publish with — what you see is what ships.
      </p>

      <Link
        to="/edit/$pageId"
        params={{ pageId: "sample" }}
        className="group mt-6 flex items-center justify-between rounded-xl border border-border bg-background p-4 transition-colors hover:border-ring"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-foreground">
            <MousePointerClick className="size-4.5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Open the sample page</div>
            <div className="text-xs text-muted-foreground">A local playground — drag, edit, style. No sign-in.</div>
          </div>
        </div>
        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </Link>

      <div className="mt-3 rounded-xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">Open a tenant page</div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Loads and saves against a live tenant — provide the page id and the tenant’s app URL.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            className="w-32"
            placeholder="page id"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
          />
          <Input
            className="min-w-64 flex-1"
            placeholder="https://acme.brandsapp.io"
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
          />
          <Button onClick={open} disabled={!pageId.trim()}>
            Open
          </Button>
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Click to select · double-click text to edit · drag palette chips or layers onto the canvas · ⌘Z/⌘⇧Z
        undo/redo · ⌘D duplicate · ⌘C/⌘V copy-paste · Delete to remove. Realtime collab runs through the
        DocRoom DO; sign-in gating comes later.
      </p>
    </main>
  )
}
