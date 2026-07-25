import { useState } from "react"

import type { Doc, Node } from "@brandsapp/builder-core"
import { updateProps, updateResponsiveStyle } from "../lib/doc-ops"
import { moduleInfo } from "../lib/registry"
import { MediaDialog } from "./media-dialog"
import { RichTextDialog } from "./richtext-dialog"

interface InspectorProps {
  doc: Doc
  node?: Node
  onChange: (d: Doc) => void
  /** Active breakpoint id, or null for the base layer. Style edits target it. */
  activeBp: string | null
}

const SELECTS: Record<string, string[]> = {
  display: ["", "block", "flex", "inline-flex", "grid", "inline-block", "none"],
  flexDirection: ["", "row", "column", "row-reverse", "column-reverse"],
  alignItems: ["", "flex-start", "center", "flex-end", "stretch", "baseline"],
  justifyContent: ["", "flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"],
  textAlign: ["", "left", "center", "right", "justify"],
  fontWeight: ["", "300", "400", "500", "600", "700", "800"],
}

const GROUPS: { title: string; fields: { key: string; kind: "text" | "select" | "color" }[] }[] = [
  {
    title: "Layout",
    fields: [
      { key: "display", kind: "select" },
      { key: "flexDirection", kind: "select" },
      { key: "gap", kind: "text" },
      { key: "alignItems", kind: "select" },
      { key: "justifyContent", kind: "select" },
    ],
  },
  { title: "Spacing", fields: [{ key: "padding", kind: "text" }, { key: "margin", kind: "text" }] },
  {
    title: "Size",
    fields: [{ key: "width", kind: "text" }, { key: "maxWidth", kind: "text" }, { key: "height", kind: "text" }],
  },
  {
    title: "Typography",
    fields: [
      { key: "color", kind: "color" },
      { key: "fontSize", kind: "text" },
      { key: "fontWeight", kind: "select" },
      { key: "textAlign", kind: "select" },
      { key: "lineHeight", kind: "text" },
    ],
  },
  {
    title: "Background & border",
    fields: [
      { key: "background", kind: "color" },
      { key: "borderRadius", kind: "text" },
      { key: "border", kind: "text" },
    ],
  },
]

const isHex = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)

export function Inspector({ doc, node, onChange, activeBp }: InspectorProps) {
  const [mediaKey, setMediaKey] = useState<string | null>(null)
  const [richKey, setRichKey] = useState<string | null>(null)

  if (!node) return <div className="inspector muted small">Select a layer to edit it.</div>

  const info = moduleInfo(node.module)
  const setProp = (key: string, value: unknown) => onChange(updateProps(doc, node.id, { [key]: value }))
  const setStyle = (key: string, value: string) =>
    onChange(updateResponsiveStyle(doc, node.id, activeBp, { [key]: value }))
  const patch = (p: Partial<Node>) =>
    onChange({ ...doc, nodes: { ...doc.nodes, [node.id]: { ...node, ...p } } })

  // Style value for the active layer; when on a breakpoint show the base as placeholder.
  const baseStyle = (k: string) => node.style?.[k] ?? ""
  const styleVal = (k: string) => (activeBp ? node.responsive?.[activeBp]?.style?.[k] ?? "" : baseStyle(k))

  return (
    <div className="inspector">
      <div className="inspector-head">
        <div className="section-title" style={{ padding: 0 }}>
          {node.module}
        </div>
        <input
          className="ins-label"
          placeholder="layer name"
          value={node.label ?? ""}
          onChange={(e) => patch({ label: e.target.value || undefined })}
        />
      </div>

      {info && Object.keys(info.schema).length > 0 && <div className="section-title">Content</div>}
      {info &&
        Object.entries(info.schema).map(([key, control]) => {
          const value = node.props[key]
          const label = control.label ?? key
          if (control.type === "media") {
            return (
              <div key={key} className="field">
                <span>{label}</span>
                <div className="media-field">
                  <input value={value == null ? "" : String(value)} onChange={(e) => setProp(key, e.target.value)} />
                  <button className="mini" onClick={() => setMediaKey(key)}>
                    Choose
                  </button>
                </div>
              </div>
            )
          }
          if (control.type === "richtext") {
            return (
              <div key={key} className="field">
                <span>{label}</span>
                <button className="mini wide" onClick={() => setRichKey(key)}>
                  Edit rich text…
                </button>
              </div>
            )
          }
          return (
            <label key={key} className="field">
              <span>{label}</span>
              {control.type === "boolean" ? (
                <input type="checkbox" checked={Boolean(value)} onChange={(e) => setProp(key, e.target.checked)} />
              ) : control.type === "number" ? (
                <input
                  type="number"
                  value={value == null ? "" : String(value)}
                  onChange={(e) => setProp(key, e.target.value === "" ? undefined : Number(e.target.value))}
                />
              ) : control.type === "select" && control.options ? (
                <select value={String(value ?? "")} onChange={(e) => setProp(key, e.target.value)}>
                  {control.options.map((o) => (
                    <option key={String(o.value)} value={String(o.value)}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={value == null ? "" : String(value)} onChange={(e) => setProp(key, e.target.value)} />
              )}
            </label>
          )
        })}

      <div className="section-title style-head">
        Style
        {activeBp && <span className="bp-tag">{activeBp}</span>}
      </div>
      {GROUPS.map((g) => (
        <div key={g.title} className="field-group">
          <div className="group-title">{g.title}</div>
          {g.fields.map((f) => (
            <label key={f.key} className="field">
              <span>{f.key}</span>
              {f.kind === "select" ? (
                <select value={styleVal(f.key)} onChange={(e) => setStyle(f.key, e.target.value)}>
                  {(SELECTS[f.key] ?? [""]).map((o) => (
                    <option key={o} value={o}>
                      {o || "—"}
                    </option>
                  ))}
                </select>
              ) : f.kind === "color" ? (
                <div className="color-row">
                  <input
                    type="color"
                    value={isHex(styleVal(f.key)) ? styleVal(f.key) : "#000000"}
                    onChange={(e) => setStyle(f.key, e.target.value)}
                  />
                  <input
                    value={styleVal(f.key)}
                    placeholder={activeBp ? baseStyle(f.key) || "—" : "—"}
                    onChange={(e) => setStyle(f.key, e.target.value)}
                  />
                </div>
              ) : (
                <input
                  value={styleVal(f.key)}
                  placeholder={activeBp ? baseStyle(f.key) || "—" : "—"}
                  onChange={(e) => setStyle(f.key, e.target.value)}
                />
              )}
            </label>
          ))}
        </div>
      ))}

      {mediaKey && (
        <MediaDialog
          value={String(node.props[mediaKey] ?? "")}
          onPick={(url) => setProp(mediaKey, url)}
          onClose={() => setMediaKey(null)}
        />
      )}
      {richKey && (
        <RichTextDialog
          html={String(node.props[richKey] ?? "")}
          onSave={(h) => {
            setProp(richKey, h)
            setRichKey(null)
          }}
          onClose={() => setRichKey(null)}
        />
      )}
    </div>
  )
}
