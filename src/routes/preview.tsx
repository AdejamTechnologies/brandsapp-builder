import { useEffect, useMemo, useState } from "react"
import { useParams, useSearch } from "@tanstack/react-router"

// pageScripts replaces the hand-kept loader list (24 Nov 2026).
import { generateUtilityCss, pageScripts, parseDoc, renderDocToReact, themeFontHref, type Doc } from "@brandsapp/builder-core"
import { docFor, isDemoPage } from "../lib/demo-docs"
import { registry } from "../lib/registry"

/**
 * Read-only, shareable render of a page — exactly what publishes (isEditor: false),
 * with the interactive runtime (tabs / dropdown / scroll reveal) live. Reached via
 * the Share link in the editor: /preview/<pageId>?tenant=<brand-slug>.
 */
export function PreviewPage() {
  const { pageId } = useParams({ from: "/preview/$pageId" })
  const search = useSearch({ strict: false }) as { tenant?: string }
  const tenant = search.tenant ?? ""
  const [doc, setDoc] = useState<Doc | null>(null)
  const [err, setErr] = useState("")

  useEffect(() => {
    // A local demo has no tenant to fetch from — render it straight, so
    // /preview/<demo> shows exactly what publishes.
    if (isDemoPage(pageId)) return setDoc(parseDoc(docFor(pageId)))
    if (!tenant) return setErr("Add ?tenant=<brand-slug> to preview this page.")
    fetch(`/api/pages/${encodeURIComponent(pageId)}?tenant=${encodeURIComponent(tenant)}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ doc?: unknown }>) : Promise.reject(new Error(`load failed (${r.status})`))))
      .then((d) => setDoc(parseDoc(d.doc)))
      .catch((e) => setErr(e instanceof Error ? e.message : "load failed"))
  }, [tenant, pageId])

  const result = useMemo(() => {
    if (!doc) return null
    try {
      return renderDocToReact(doc, { registry, isEditor: false })
    } catch {
      return null
    }
  }, [doc])

  const [utilCss, setUtilCss] = useState("")
  useEffect(() => {
    if (!result) return
    let cancelled = false
    generateUtilityCss(result.classes.length ? [result.classes.join(" ")] : []).then((css) => {
      if (!cancelled) setUtilCss(css)
    })
    return () => {
      cancelled = true
    }
  }, [result])

  // Interactive runtime (tabs / dropdown / scroll reveal) — inject as a live script
  // once the tree is mounted so behaviours match the published page.
  useEffect(() => {
    // Presets and interactions run without the core runtime (24 Nov 2026).
    if (!result) return
    if (!pageScripts({ html: document.body.innerHTML, usesRuntime: result.usesRuntime }).length) return
    const s = document.createElement("script")
    // Same rule as the tenant host: the animation loader only ships when the
    // page actually contains one of those elements.
    // The shared list (24 Nov 2026, builder-core/page-scripts.ts) — the same
    // runtimes the brand's live page and the pitch file load, presets and
    // interactions included.
    s.textContent = pageScripts({ html: document.body.innerHTML, usesRuntime: result.usesRuntime }).join("\n")
    document.body.appendChild(s)
    return () => {
      s.remove()
    }
  }, [result, doc])

  if (err) return <div className="p-8 text-sm text-muted-foreground">{err}</div>
  if (!result) return <div className="p-8 text-sm text-muted-foreground">Loading preview…</div>
  const fontHref = doc ? themeFontHref(doc.theme) : null
  return (
    <div className="preview-wrap">
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      <style>{result.css}</style>
      <style>{utilCss ? `@scope (.bapp-root) { ${utilCss} }` : ""}</style>
      {result.node}
    </div>
  )
}
