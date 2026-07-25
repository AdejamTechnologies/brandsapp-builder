import { useState } from "react"

import { fragment as fragmentSchema, type Fragment } from "@brandsapp/builder-core"
import { TEMPLATES } from "../lib/templates"

interface LibraryDialogProps {
  onInsert: (frag: Fragment) => void
  onClose: () => void
}

/** Add a pre-built section, or install a marketplace Fragment pasted as JSON. */
export function LibraryDialog({ onInsert, onClose }: LibraryDialogProps) {
  const [json, setJson] = useState("")
  const [err, setErr] = useState("")

  const install = () => {
    try {
      const frag = fragmentSchema.parse(JSON.parse(json))
      onInsert(frag)
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid Fragment JSON")
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="section-title">Add a section</div>
        <div className="tpl-grid">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              className="tpl-card"
              onClick={() => {
                onInsert(t.make())
                onClose()
              }}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div className="section-title">Install a Fragment</div>
        <p className="muted small" style={{ margin: "0 0 8px" }}>
          Paste Fragment JSON (from the editor’s Export, or a marketplace listing).
        </p>
        <textarea
          className="import-area"
          style={{ height: 160 }}
          placeholder='{"version":1,"rootId":"…","nodes":{…},"styles":{…},"manifest":{…}}'
          value={json}
          onChange={(e) => {
            setJson(e.target.value)
            setErr("")
          }}
        />
        {err && <div className="media-warn">{err}</div>}
        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>
            Close
          </button>
          <button onClick={install} disabled={!json.trim()}>
            Install
          </button>
        </div>
      </div>
    </div>
  )
}
