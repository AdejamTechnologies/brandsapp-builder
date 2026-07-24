import { useEffect, useMemo, useState } from "react"
import { useParams, useSearch } from "@tanstack/react-router"

import { preview, previewSrcDoc } from "../lib/preview"
import { useDocRoom } from "../lib/realtime"
import { SAMPLE_DOC } from "../lib/sample"

/**
 * P2 editor SHELL. A working JSON ⇄ live-preview loop over the real engine, plus
 * realtime relay wiring. The visual canvas / drag-and-drop / properties panel is
 * what moves in from Polaris on top of this.
 */
export function EditorPage() {
  const { pageId } = useParams({ from: "/edit/$pageId" })
  // tenant base url comes from the querystring in dev (?tenant=https://…)
  const search = useSearch({ strict: false }) as { tenant?: string }
  const tenant = search.tenant ?? ""

  const [text, setText] = useState(() => JSON.stringify(SAMPLE_DOC, null, 2))
  const [status, setStatus] = useState<string>("")

  // load the page's Doc from the tenant (via the worker proxy) if configured
  useEffect(() => {
    if (!tenant || pageId === "sample") return
    const q = `?tenant=${encodeURIComponent(tenant)}`
    fetch(`/api/pages/${encodeURIComponent(pageId)}${q}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ doc?: unknown }>) : null))
      .then((d) => {
        if (d?.doc) setText(JSON.stringify(d.doc, null, 2))
      })
      .catch(() => {})
  }, [tenant, pageId])

  // realtime: broadcast local edits, apply remote ones
  const room = `${tenant || "local"}:${pageId}`
  const { send } = useDocRoom(room, (data) => {
    if (data && data !== text) setText(data)
  })

  const result = useMemo(() => {
    try {
      return preview(JSON.parse(text))
    } catch (e) {
      return { html: "", css: "", missing: [], error: e instanceof Error ? e.message : "invalid JSON" }
    }
  }, [text])

  const onChange = (v: string) => {
    setText(v)
    send(v)
  }

  const save = async () => {
    if (!tenant) {
      setStatus("No tenant configured (add ?tenant=<url>).")
      return
    }
    setStatus("Saving…")
    try {
      const res = await fetch(`/api/pages/${encodeURIComponent(pageId)}?tenant=${encodeURIComponent(tenant)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ doc: JSON.parse(text) }),
      })
      setStatus(res.ok ? "Saved ✓" : `Save failed (${res.status})`)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "save failed")
    }
  }

  return (
    <div className="editor">
      <div className="pane pane-code">
        <div className="pane-head">
          <strong>{pageId}</strong>
          <div className="actions">
            {result.error && <span className="err">{result.error}</span>}
            {result.missing.length > 0 && (
              <span className="warn">missing: {result.missing.join(", ")}</span>
            )}
            <span className="muted small">{status}</span>
            <button onClick={save}>Save</button>
          </div>
        </div>
        <textarea value={text} spellCheck={false} onChange={(e) => onChange(e.target.value)} />
      </div>
      <div className="pane pane-preview">
        <iframe title="preview" srcDoc={previewSrcDoc(result)} />
      </div>
    </div>
  )
}
