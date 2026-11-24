import { useEffect, useState, type ReactNode } from "react"
import { Link, useParams, useSearch } from "@tanstack/react-router"
import { Monitor } from "lucide-react"

import { Button } from "./ui/button"

/**
 * The editor needs room: three columns — elements, the canvas, the inspector —
 * at 232px + the page + 288px. On a phone the two side columns took the whole
 * width and the CANVAS came out zero pixels wide: an editor with nothing to
 * edit, and nothing on screen to say why (tested 23 Nov 2026).
 *
 * Squeezing a pro editor onto a phone would make it worse at both, and owners
 * on a phone already have a phone-first editor for their pages — Builder &
 * Pages in their own console. So below the width the three columns fit in, the
 * editor says so, offers that path, offers a look at the page, and still lets a
 * tablet user who knows what they are doing carry on.
 */
const NEEDS = 960

export function NarrowGate({ children }: { children: ReactNode }) {
  const [narrow, setNarrow] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth < NEEDS
  )
  const [anyway, setAnyway] = useState(false)
  const { pageId } = useParams({ strict: false }) as { pageId?: string }
  const search = useSearch({ strict: false }) as { tenant?: string }

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < NEEDS)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  if (!narrow || anyway) return <>{children}</>

  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-accent text-foreground">
        <Monitor className="size-6" />
      </div>
      <h1 className="mt-4 text-lg font-semibold text-foreground">This editor needs a bigger screen</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        It works with three panels side by side — elements, your page and its settings — which a
        phone has no room for. Open it on a laptop or a tablet held sideways.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        On a phone, change your pages in your brand's console instead: <strong>Builder &amp; Pages</strong>{" "}
        is made for it.
      </p>
      <div className="mt-6 flex w-full flex-col gap-2">
        {pageId && (
          <Button
            // no-underline: the app styles every <a>, and this one is a button.
            className="min-h-11 no-underline"
            render={
              <Link
                to="/preview/$pageId"
                params={{ pageId }}
                search={search.tenant ? { tenant: search.tenant } : undefined}
              />
            }
          >
            Look at this page
          </Button>
        )}
        <Button variant="outline" className="min-h-11" onClick={() => setAnyway(true)}>
          Open the editor anyway
        </Button>
        <Button variant="ghost" className="min-h-11 no-underline" render={<Link to="/" />}>
          Back
        </Button>
      </div>
    </main>
  )
}
