import { useState } from "react"

import type { ThemeTokens } from "@brandsapp/builder-core"

interface ThemeDialogProps {
  theme: ThemeTokens
  onChange: (patch: Partial<ThemeTokens>) => void
  onClose: () => void
}

const isHex = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)

/** Edit the doc theme — colors, fonts, radii. Changes apply live to the canvas. */
export function ThemeDialog({ theme, onChange, onClose }: ThemeDialogProps) {
  const [newColorKey, setNewColorKey] = useState("")

  const colors = theme.colors ?? {}
  const radius = theme.radius ?? {}

  const setColor = (k: string, v: string) => onChange({ colors: { ...colors, [k]: v } })
  const removeColor = (k: string) => {
    const next = { ...colors }
    delete next[k]
    onChange({ colors: next })
  }
  const setRadius = (k: string, v: string) => onChange({ radius: { ...radius, [k]: v } })
  const setFont = (which: "display" | "body", v: string) =>
    onChange({ fonts: { ...theme.fonts, [which]: v || undefined } })

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="section-title">Theme</div>

        <div className="group-title">Colors</div>
        {Object.entries(colors).map(([k, v]) => (
          <div key={k} className="field">
            <span>{k}</span>
            <div className="color-row">
              <input type="color" value={isHex(v) ? v : "#000000"} onChange={(e) => setColor(k, e.target.value)} />
              <input value={v} onChange={(e) => setColor(k, e.target.value)} />
              <button className="mini" onClick={() => removeColor(k)} title="Remove">
                ×
              </button>
            </div>
          </div>
        ))}
        <div className="field">
          <span>add</span>
          <div className="color-row">
            <input placeholder="name (e.g. accent)" value={newColorKey} onChange={(e) => setNewColorKey(e.target.value)} />
            <button
              className="mini"
              onClick={() => {
                const k = newColorKey.trim()
                if (k) {
                  setColor(k, "#4f46e5")
                  setNewColorKey("")
                }
              }}
            >
              Add
            </button>
          </div>
        </div>

        <div className="group-title">Fonts</div>
        <label className="field">
          <span>display</span>
          <input value={theme.fonts?.display ?? ""} placeholder="e.g. Georgia, serif" onChange={(e) => setFont("display", e.target.value)} />
        </label>
        <label className="field">
          <span>body</span>
          <input value={theme.fonts?.body ?? ""} placeholder="e.g. Inter, sans-serif" onChange={(e) => setFont("body", e.target.value)} />
        </label>

        <div className="group-title">Radius</div>
        {Object.entries(radius).map(([k, v]) => (
          <label key={k} className="field">
            <span>{k}</span>
            <input value={v} onChange={(e) => setRadius(k, e.target.value)} />
          </label>
        ))}
        {Object.keys(radius).length === 0 && (
          <label className="field">
            <span>base</span>
            <input placeholder="e.g. 10px" onChange={(e) => setRadius("base", e.target.value)} />
          </label>
        )}

        <div className="modal-actions">
          <button onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
