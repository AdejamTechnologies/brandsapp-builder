import { useRouter } from "@tanstack/react-router"

/**
 * What a screen shows when it has thrown.
 *
 * Without this, a screen that throws leaves the builder blank and puts a raw
 * stack in the console — which is the whole of what the author is told. They
 * are not reading the console, so what they experience is a page that stopped
 * existing.
 *
 * This does NOT catch everything, and the distinction matters. A throw while a
 * MODULE is evaluating happens before React has rendered anything, so no
 * boundary in the app can see it — the bundle simply fails and the page stays
 * empty. (That is exactly what a `templateManifest.parse({ id: "", name: "" })`
 * at the top of the Template dialog did: every route in this app is imported
 * statically by `router.tsx`, so one module throwing took the whole builder
 * down.) The defence against that one is a test, not a boundary.
 *
 * What this does catch is everything after mount: a render that throws, a
 * loader that rejects. Those get a sentence the author can act on, a way back,
 * and the detail stays available for us rather than being the only thing said.
 */
export function RouteError({ error }: { error: Error }) {
  const router = useRouter()
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md w-full rounded-xl border border-border bg-background p-6 shadow-sm">
        <h1 className="text-base font-semibold text-foreground">
          This screen stopped
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your work is saved — the editor writes as you go. Reloading usually
          brings the screen back.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => router.invalidate()}
            className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground"
          >
            Reload
          </button>
        </div>
        {/* Collapsed, not hidden: the author did not cause this and should not
            have to read it, but whoever they forward it to does. */}
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Details
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-2 text-[11px] leading-relaxed text-muted-foreground">
            {error?.message ?? String(error)}
          </pre>
        </details>
      </div>
    </div>
  )
}
