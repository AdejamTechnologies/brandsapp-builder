import { useEffect, useMemo, useState } from "react"
import { useParams, useSearch } from "@tanstack/react-router"

import { ANIMATION_LOADER,
  RECAPTCHA_LOADER,
  BUILDER_RUNTIME, generateUtilityCss, parseDoc, renderDocToReact, themeFontHref, type Doc } from "@brandsapp/builder-core"
import { registry } from "../lib/registry"

/**
 * Read-only, shareable render of a page — exactly what publishes (isEditor: false),
 * with the interactive runtime (tabs / dropdown / scroll reveal) live. Reached via
 * the Share link in the editor: /preview/<pageId>?tenant=<url>.
 */
export function PreviewPage() {
  const { pageId } = useParams({ from: "/preview/$pageId" })
  const search = useSearch({ strict: false }) as { tenant?: string }
  const tenant = search.tenant ?? ""
  const [doc, setDoc] = useState<Doc | null>(null)
  const [err, setErr] = useState("")

  useEffect(() => {
    if (!tenant) return setErr("Add ?tenant=<url> to preview this page.")
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
    if (!result?.usesRuntime) return
    const s = document.createElement("script")
    // Same rule as the tenant host: the animation loader only ships when the
    // page actually contains one of those elements.
    s.textContent =
      BUILDER_RUNTIME +
      (/data-bapp-(lottie|spline|rive)/.test(document.body.innerHTML) ? "\n" + ANIMATION_LOADER : "") +
      (/data-bapp-recaptcha/.test(document.body.innerHTML) ? "\n" + RECAPTCHA_LOADER : "")
    document.body.appendChild(s)
    return () => {
      s.remove()
    }
  }, [result?.usesRuntime, doc])

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
